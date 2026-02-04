-- Migration: Secure 2FA Secrets
-- Move 2FA secrets to a service-role-only table for security

-- Create secure table for 2FA secrets (NOT accessible by users via RLS)
CREATE TABLE IF NOT EXISTS public.secure_2fa_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  secret TEXT NOT NULL,
  backup_codes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies - only service_role can access this table
-- This is intentional for security
ALTER TABLE public.secure_2fa_secrets ENABLE ROW LEVEL SECURITY;

-- Allow only the service_role to read and write secure 2FA secrets
CREATE POLICY secure_2fa_secrets_service_role_only
  ON public.secure_2fa_secrets
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_secure_2fa_secrets_user_id ON public.secure_2fa_secrets(user_id);

-- Function to enable 2FA (server-side only, called via Edge Function)
CREATE OR REPLACE FUNCTION public.enable_2fa_secure(
  p_user_id UUID,
  p_secret TEXT,
  p_backup_codes TEXT[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert or update 2FA secret in secure table
  INSERT INTO public.secure_2fa_secrets (user_id, secret, backup_codes, updated_at)
  VALUES (p_user_id, p_secret, p_backup_codes, now())
  ON CONFLICT (user_id) DO UPDATE SET
    secret = EXCLUDED.secret,
    backup_codes = EXCLUDED.backup_codes,
    updated_at = now();
  
  -- Update profiles to mark 2FA as enabled
  UPDATE public.profiles
  SET twofa_enabled = true
  WHERE id = p_user_id;
  
  RETURN true;
END;
$$;

-- Function to disable 2FA
CREATE OR REPLACE FUNCTION public.disable_2fa_secure(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remove 2FA secret
  DELETE FROM public.secure_2fa_secrets WHERE user_id = p_user_id;
  
  -- Update profiles to mark 2FA as disabled
  UPDATE public.profiles
  SET twofa_enabled = false
  WHERE id = p_user_id;
  
  RETURN true;
END;
$$;

-- Function to check if 2FA is enabled for a user (safe to call from client)
CREATE OR REPLACE FUNCTION public.is_2fa_enabled(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT twofa_enabled FROM public.profiles WHERE id = p_user_id),
    false
  );
$$;

-- Remove the old twofa_secret column from profiles if it exists
-- (Keep twofa_enabled and twofa_backup_codes for backwards compatibility during migration)
-- DO NOT remove columns in production without data migration first
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS twofa_secret;

COMMENT ON TABLE public.secure_2fa_secrets IS 'Secure storage for 2FA TOTP secrets. Only accessible via service_role for security.';
