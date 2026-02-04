-- Premium Billing System Tables
-- Supports Stripe subscriptions and RevenueCat mobile in-app purchases

-- Add billing columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS premium_tier TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS premium_since TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS premium_canceled_at TIMESTAMPTZ;

-- Stripe-specific columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT;

-- RevenueCat-specific columns (for mobile)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS revenuecat_user_id TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS revenuecat_subscription_id TEXT;

-- Create index on premium users
CREATE INDEX IF NOT EXISTS idx_profiles_is_premium ON profiles(is_premium) WHERE is_premium = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON profiles(stripe_customer_id);

-- Stripe prices table
CREATE TABLE IF NOT EXISTS stripe_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL UNIQUE,
  stripe_product_id TEXT NOT NULL,
  stripe_price_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  interval TEXT, -- 'month', 'year', or NULL for one-time
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription events log
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'subscription_created', 'subscription_canceled', 'payment_succeeded', 'payment_failed', etc.
  product_id TEXT,
  stripe_session_id TEXT,
  stripe_subscription_id TEXT,
  stripe_invoice_id TEXT,
  amount INTEGER,
  currency TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_user ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created ON subscription_events(created_at DESC);

-- Premium feature usage tracking
CREATE TABLE IF NOT EXISTS premium_feature_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  usage_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_premium_feature_usage_user_feature 
  ON premium_feature_usage(user_id, feature_name);

-- Function: Check premium access
CREATE OR REPLACE FUNCTION check_premium_access(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_premium BOOLEAN;
  v_expires_at TIMESTAMPTZ;
BEGIN
  SELECT is_premium, premium_expires_at
  INTO v_is_premium, v_expires_at
  FROM profiles
  WHERE id = p_user_id;

  -- Not premium at all
  IF NOT v_is_premium THEN
    RETURN FALSE;
  END IF;

  -- Lifetime member (no expiration)
  IF v_expires_at IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check if subscription is still valid
  RETURN v_expires_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Track feature usage
CREATE OR REPLACE FUNCTION track_premium_feature(
  p_user_id UUID,
  p_feature_name TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO premium_feature_usage (user_id, feature_name, metadata, last_used_at)
  VALUES (p_user_id, p_feature_name, p_metadata, NOW())
  ON CONFLICT (user_id, feature_name)
  DO UPDATE SET
    usage_count = premium_feature_usage.usage_count + 1,
    last_used_at = NOW(),
    metadata = p_metadata;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get subscription statistics (for admin dashboard)
CREATE OR REPLACE FUNCTION get_subscription_stats()
RETURNS TABLE(
  total_subscribers BIGINT,
  active_monthly BIGINT,
  active_annual BIGINT,
  lifetime_members BIGINT,
  trial_users BIGINT,
  monthly_revenue NUMERIC,
  annual_revenue NUMERIC,
  lifetime_revenue NUMERIC,
  churn_rate NUMERIC,
  trial_conversion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) FILTER (WHERE is_premium = TRUE) as total_premium,
      COUNT(*) FILTER (WHERE premium_tier = 'premium_monthly' AND is_premium = TRUE) as monthly_subs,
      COUNT(*) FILTER (WHERE premium_tier = 'premium_annual' AND is_premium = TRUE) as annual_subs,
      COUNT(*) FILTER (WHERE premium_tier = 'premium_lifetime') as lifetime_subs,
      COUNT(*) FILTER (WHERE stripe_subscription_status = 'trialing') as trial_count
    FROM profiles
  ),
  revenue AS (
    SELECT
      SUM(amount) FILTER (WHERE event_type = 'payment_succeeded' AND product_id = 'premium_monthly') / 100.0 as monthly_rev,
      SUM(amount) FILTER (WHERE event_type = 'payment_succeeded' AND product_id = 'premium_annual') / 100.0 as annual_rev,
      SUM(amount) FILTER (WHERE event_type = 'payment_succeeded' AND product_id = 'premium_lifetime') / 100.0 as lifetime_rev
    FROM subscription_events
    WHERE created_at >= NOW() - INTERVAL '30 days'
  ),
  churn AS (
    SELECT
      COUNT(*) FILTER (WHERE event_type = 'subscription_canceled' AND created_at >= NOW() - INTERVAL '30 days') as canceled,
      COUNT(*) FILTER (WHERE event_type = 'subscription_created' AND created_at >= NOW() - INTERVAL '30 days') as created
    FROM subscription_events
  )
  SELECT
    stats.total_premium,
    stats.monthly_subs,
    stats.annual_subs,
    stats.lifetime_subs,
    stats.trial_count,
    COALESCE(revenue.monthly_rev, 0),
    COALESCE(revenue.annual_rev, 0),
    COALESCE(revenue.lifetime_rev, 0),
    CASE 
      WHEN churn.created > 0 THEN (churn.canceled::NUMERIC / churn.created::NUMERIC * 100)
      ELSE 0
    END as churn_pct,
    CASE
      WHEN stats.trial_count > 0 THEN (stats.total_premium::NUMERIC / (stats.total_premium + stats.trial_count)::NUMERIC * 100)
      ELSE 0
    END as conversion_pct
  FROM stats, revenue, churn;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get user's premium features usage
CREATE OR REPLACE FUNCTION get_user_premium_usage(p_user_id UUID)
RETURNS TABLE(
  feature_name TEXT,
  usage_count INTEGER,
  last_used_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pfu.feature_name,
    pfu.usage_count,
    pfu.last_used_at
  FROM premium_feature_usage pfu
  WHERE pfu.user_id = p_user_id
  ORDER BY pfu.usage_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies

-- Profiles billing columns
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own billing info
CREATE POLICY "Users can view own billing info"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Subscription events
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription events"
  ON subscription_events FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert events
CREATE POLICY "Service role can insert subscription events"
  ON subscription_events FOR INSERT
  WITH CHECK (true);

-- Premium feature usage
ALTER TABLE premium_feature_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feature usage"
  ON premium_feature_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Stripe prices (public read)
ALTER TABLE stripe_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view prices"
  ON stripe_prices FOR SELECT
  TO public
  USING (true);

-- Seed initial products
INSERT INTO stripe_prices (product_id, stripe_product_id, stripe_price_id, amount, interval)
VALUES
  ('premium_monthly', 'prod_placeholder_monthly', 'price_placeholder_monthly', 999, 'month'),
  ('premium_annual', 'prod_placeholder_annual', 'price_placeholder_annual', 8999, 'year'),
  ('premium_lifetime', 'prod_placeholder_lifetime', 'price_placeholder_lifetime', 19999, NULL)
ON CONFLICT (product_id) DO NOTHING;

-- Comments
COMMENT ON TABLE subscription_events IS 'Log of all subscription lifecycle events for analytics and debugging';
COMMENT ON TABLE premium_feature_usage IS 'Tracks premium feature usage per user for analytics';
COMMENT ON FUNCTION check_premium_access IS 'Returns TRUE if user has valid premium access';
COMMENT ON FUNCTION track_premium_feature IS 'Increments usage counter for a premium feature';
COMMENT ON FUNCTION get_subscription_stats IS 'Returns aggregated subscription metrics for admin dashboard';
