-- Billing & Subscriptions core schema (Stripe)
-- Creates subscriptions, credits, billing_events

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'trialing',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON public.subscriptions(plan);

-- Credits table
CREATE TABLE IF NOT EXISTS public.credits (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Billing events log (idempotency + audit)
CREATE TABLE IF NOT EXISTS public.billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider_event_id TEXT UNIQUE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_user ON public.billing_events(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_type ON public.billing_events(type);
CREATE INDEX IF NOT EXISTS idx_billing_events_created ON public.billing_events(created_at DESC);

-- RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

-- Users can see their own subscription/credits
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own credits" ON public.credits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions
  USING (auth.role() = 'service_role') WITH CHECK (true);

CREATE POLICY "Service role can manage credits" ON public.credits
  USING (auth.role() = 'service_role') WITH CHECK (true);

CREATE POLICY "Service role can manage billing events" ON public.billing_events
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (true);

-- Utility: upsert credits
CREATE OR REPLACE FUNCTION public.set_credits(p_user_id UUID, p_balance INTEGER)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.credits (user_id, balance, updated_at)
  VALUES (p_user_id, p_balance, NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET balance = EXCLUDED.balance,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.subscriptions IS 'Stripe-backed subscription state per user';
COMMENT ON TABLE public.credits IS 'Credit balance per user, resets on renewal';
COMMENT ON TABLE public.billing_events IS 'Raw billing/provider events for audit/idempotency';
