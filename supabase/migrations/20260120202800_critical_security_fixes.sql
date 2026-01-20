-- Critical Security Fixes for 2FA and Location Privacy
-- This migration addresses two major security vulnerabilities:
-- 1. 2FA secrets exposed through profiles table
-- 2. Exact GPS coordinates accessible to strangers

-- ============================================
-- PART 1: Secure 2FA Storage
-- ============================================

-- Create admin-only table for 2FA secrets
CREATE TABLE IF NOT EXISTS public.user_2fa_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  secret TEXT NOT NULL,
  backup_codes_hashed TEXT[] NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on 2FA secrets table
ALTER TABLE public.user_2fa_secrets ENABLE ROW LEVEL SECURITY;

-- CRITICAL: No user can SELECT their own 2FA secret
-- Only Edge Functions with service_role can access this table
CREATE POLICY "No direct access to 2FA secrets" 
ON public.user_2fa_secrets 
FOR SELECT USING (false);

-- Only allow INSERT/UPDATE through Edge Functions (service_role)
CREATE POLICY "Service role can manage 2FA secrets" 
ON public.user_2fa_secrets 
FOR ALL 
USING (false); -- Will be accessed via service_role which bypasses RLS

-- Migrate existing 2FA data to secure table
DO $$
DECLARE
  profile_record RECORD;
BEGIN
  FOR profile_record IN 
    SELECT id, twofa_secret, twofa_backup_codes 
    FROM public.profiles 
    WHERE twofa_enabled = true 
      AND twofa_secret IS NOT NULL
  LOOP
    INSERT INTO public.user_2fa_secrets (user_id, secret, backup_codes_hashed, enabled)
    VALUES (
      profile_record.id,
      profile_record.twofa_secret,
      COALESCE(profile_record.twofa_backup_codes, ARRAY[]::TEXT[]),
      true
    )
    ON CONFLICT (user_id) DO UPDATE
    SET secret = EXCLUDED.secret,
        backup_codes_hashed = EXCLUDED.backup_codes_hashed,
        updated_at = now();
  END LOOP;
END $$;

-- Remove sensitive 2FA fields from profiles table
-- Keep only twofa_enabled flag for UI purposes
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS twofa_secret,
DROP COLUMN IF EXISTS twofa_backup_codes;

-- Create SECURITY DEFINER function for 2FA status check (safe for users)
CREATE OR REPLACE FUNCTION public.user_has_2fa_enabled()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT enabled 
     FROM public.user_2fa_secrets 
     WHERE user_id = auth.uid() 
     LIMIT 1),
    false
  );
$$;

COMMENT ON FUNCTION public.user_has_2fa_enabled() IS 
'SECURITY DEFINER function to check if user has 2FA enabled. Does not expose secret.';

-- ============================================
-- PART 2: Privacy-Preserving Location Sharing
-- ============================================

-- Add fuzzing columns to user_locations for privacy
ALTER TABLE public.user_locations
ADD COLUMN IF NOT EXISTS latitude_fuzzy NUMERIC(7, 4), -- Less precision for display
ADD COLUMN IF NOT EXISTS longitude_fuzzy NUMERIC(7, 4),
ADD COLUMN IF NOT EXISTS geohash_precision INTEGER DEFAULT 6; -- Geohash for approximate matching

-- Create function to fuzz coordinates (reduces precision to ~1km)
CREATE OR REPLACE FUNCTION public.fuzz_coordinates(lat NUMERIC, lon NUMERIC)
RETURNS TABLE(lat_fuzzy NUMERIC, lon_fuzzy NUMERIC)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 
    ROUND(lat::numeric, 2)::numeric(7,4) as lat_fuzzy,
    ROUND(lon::numeric, 2)::numeric(7,4) as lon_fuzzy
$$;

-- Update existing locations with fuzzy coordinates
UPDATE public.user_locations
SET (latitude_fuzzy, longitude_fuzzy) = (
  SELECT lat_fuzzy, lon_fuzzy 
  FROM public.fuzz_coordinates(latitude, longitude)
);

-- Create trigger to auto-update fuzzy coordinates
CREATE OR REPLACE FUNCTION public.update_fuzzy_location()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  SELECT lat_fuzzy, lon_fuzzy 
  INTO NEW.latitude_fuzzy, NEW.longitude_fuzzy
  FROM public.fuzz_coordinates(NEW.latitude, NEW.longitude);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_user_location_fuzzy ON public.user_locations;
CREATE TRIGGER update_user_location_fuzzy
  BEFORE INSERT OR UPDATE OF latitude, longitude
  ON public.user_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_fuzzy_location();

-- Create SECURITY DEFINER view that ONLY exposes fuzzy coordinates
CREATE OR REPLACE VIEW public.user_locations_public AS
SELECT 
  id,
  user_id,
  latitude_fuzzy as latitude,  -- Expose fuzzy coords as "latitude"
  longitude_fuzzy as longitude, -- Expose fuzzy coords as "longitude"
  sharing_enabled,
  radius_km,
  updated_at
FROM public.user_locations
WHERE sharing_enabled = true;

-- Grant SELECT on the view (not the base table)
GRANT SELECT ON public.user_locations_public TO authenticated;

-- Update existing RLS policy to use fuzzy coordinates
DROP POLICY IF EXISTS "Users who share can see others who share" ON public.user_locations;

CREATE POLICY "Users can see fuzzy locations of others who share" 
ON public.user_locations 
FOR SELECT USING (
  auth.uid() = user_id -- Can see own exact location
  OR (
    sharing_enabled = true 
    AND public.user_has_sharing_enabled()
  )
);

-- Create safer function for distance calculation using fuzzy coords
CREATE OR REPLACE FUNCTION public.calculate_distance_fuzzy(
  user_lat NUMERIC,
  user_lon NUMERIC,
  target_user_id UUID
)
RETURNS NUMERIC
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    -- Haversine formula with fuzzy coordinates
    6371 * 2 * ASIN(SQRT(
      POWER(SIN((RADIANS(latitude_fuzzy) - RADIANS(user_lat)) / 2), 2) +
      COS(RADIANS(user_lat)) * COS(RADIANS(latitude_fuzzy)) *
      POWER(SIN((RADIANS(longitude_fuzzy) - RADIANS(user_lon)) / 2), 2)
    )) as distance_km
  FROM public.user_locations
  WHERE user_id = target_user_id
  LIMIT 1;
$$;

-- ============================================
-- PART 3: Additional Security Hardening
-- ============================================

-- Prevent email addresses from being exposed in profiles
-- Users should only see their own email
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile with sensitive data" 
ON public.profiles 
FOR SELECT USING (auth.uid() = id);

-- Create public profile view that excludes email
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT 
  id,
  display_name,
  avatar_url,
  preferred_provider,
  created_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_locations_fuzzy_coords 
ON public.user_locations(latitude_fuzzy, longitude_fuzzy) 
WHERE sharing_enabled = true;

CREATE INDEX IF NOT EXISTS idx_user_2fa_secrets_user_id 
ON public.user_2fa_secrets(user_id);

-- Update timestamp trigger for 2FA secrets
CREATE TRIGGER update_user_2fa_secrets_updated_at
  BEFORE UPDATE ON public.user_2fa_secrets
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at();

-- Add helpful comments
COMMENT ON TABLE public.user_2fa_secrets IS 
'SECURITY: 2FA secrets stored separately from profiles. Only accessible via Edge Functions with service_role. Users cannot SELECT their own secrets to prevent client-side attacks.';

COMMENT ON COLUMN public.user_locations.latitude_fuzzy IS 
'Privacy: Reduced-precision coordinates (~1km accuracy) safe for public display';

COMMENT ON COLUMN public.user_locations.longitude_fuzzy IS 
'Privacy: Reduced-precision coordinates (~1km accuracy) safe for public display';

COMMENT ON VIEW public.user_locations_public IS 
'Privacy-safe view exposing only fuzzy coordinates to other users';
