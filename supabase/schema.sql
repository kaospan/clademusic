-- clademusic database schema
-- Generated: 2026-02-04 14:44:23+02:00
-- Source: supabase/migrations/*.sql (sorted by filename)
-- NOTE: Intended for Supabase Postgres (requires auth schema, extensions availability, etc.)

-- Extensions (prereqs)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================================
-- Migration: 20260114211348_2a4485e7-9d33-4c9d-9ea8-0420e1ad4044.sql
-- ============================================================================

-- Create app roles enum
CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'moderator');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create providers table for connected music services
CREATE TABLE public.user_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('spotify', 'youtube', 'apple_music')),
  provider_user_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

-- Create tracks table with harmonic fingerprints
CREATE TABLE public.tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('spotify', 'youtube', 'apple_music')),
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  cover_url TEXT,
  preview_url TEXT,
  duration_ms INTEGER,
  detected_key TEXT,
  detected_mode TEXT CHECK (detected_mode IN ('major', 'minor', 'unknown')),
  progression_raw TEXT[],
  progression_roman TEXT[],
  loop_length_bars INTEGER,
  cadence_type TEXT CHECK (cadence_type IN ('none', 'loop', 'plagal', 'authentic', 'deceptive', 'other')),
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  analysis_source TEXT CHECK (analysis_source IN ('metadata', 'crowd', 'analysis')),
  energy DECIMAL(3,2),
  danceability DECIMAL(3,2),
  valence DECIMAL(3,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (external_id, provider)
);

-- Create user interactions table
CREATE TABLE public.user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  track_id UUID REFERENCES public.tracks(id) ON DELETE CASCADE NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('like', 'save', 'skip', 'more_harmonic', 'more_vibe', 'share')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, track_id, interaction_type)
);

-- Create user credits table
CREATE TABLE public.user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  monthly_allowance INTEGER NOT NULL DEFAULT 100,
  credits_used INTEGER NOT NULL DEFAULT 0,
  last_reset TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create crowd submissions table for chord corrections
CREATE TABLE public.chord_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID REFERENCES public.tracks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  detected_key TEXT,
  detected_mode TEXT CHECK (detected_mode IN ('major', 'minor')),
  progression_roman TEXT[],
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  moderated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create system settings table for admin budget controls
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default system settings
INSERT INTO public.system_settings (key, value) VALUES
  ('max_analyses_per_day', '{"limit": 1000, "current": 0}'::jsonb),
  ('max_comparisons_per_day', '{"limit": 500, "current": 0}'::jsonb),
  ('global_rate_limit', '{"requests_per_minute": 60}'::jsonb);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chord_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Helper function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- User providers policies
CREATE POLICY "Users can view own providers" ON public.user_providers
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own providers" ON public.user_providers
  FOR ALL USING (auth.uid() = user_id);

-- Tracks policies (public read, admin write)
CREATE POLICY "Anyone can view tracks" ON public.tracks
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage tracks" ON public.tracks
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can insert tracks" ON public.tracks
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- User interactions policies
CREATE POLICY "Users can view own interactions" ON public.user_interactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own interactions" ON public.user_interactions
  FOR ALL USING (auth.uid() = user_id);

-- User credits policies
CREATE POLICY "Users can view own credits" ON public.user_credits
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage credits" ON public.user_credits
  FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Chord submissions policies
CREATE POLICY "Users can view submissions" ON public.chord_submissions
  FOR SELECT USING (true);
CREATE POLICY "Users can create submissions" ON public.chord_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Moderators can manage submissions" ON public.chord_submissions
  FOR UPDATE USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

-- System settings policies (admin only)
CREATE POLICY "Admins can view settings" ON public.system_settings
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage settings" ON public.system_settings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  INSERT INTO public.user_credits (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function for timestamp updates
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_tracks_updated_at
  BEFORE UPDATE ON public.tracks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();



-- ============================================================================
-- Migration: 20260114211408_1be47900-6c38-4adb-b34e-5dfe41a998e4.sql
-- ============================================================================

-- Fix function search path for update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;



-- ============================================================================
-- Migration: 20260115085704_58686868-f4a3-4d8f-9b0b-766b1d0430fc.sql
-- ============================================================================

-- Extend tracks table with provider link columns and ISRC
ALTER TABLE public.tracks 
ADD COLUMN IF NOT EXISTS isrc text,
ADD COLUMN IF NOT EXISTS url_spotify_web text,
ADD COLUMN IF NOT EXISTS url_spotify_app text,
ADD COLUMN IF NOT EXISTS spotify_id text,
ADD COLUMN IF NOT EXISTS url_youtube text,
ADD COLUMN IF NOT EXISTS youtube_id text;

-- Create index on ISRC for deduplication
CREATE INDEX IF NOT EXISTS idx_tracks_isrc ON public.tracks(isrc) WHERE isrc IS NOT NULL;

-- Add 2FA fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS twofa_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS twofa_secret text,
ADD COLUMN IF NOT EXISTS twofa_backup_codes text[],
ADD COLUMN IF NOT EXISTS preferred_provider text DEFAULT 'none';

-- Create search cache table
CREATE TABLE IF NOT EXISTS public.search_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  market text,
  results jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes')
);

CREATE INDEX IF NOT EXISTS idx_search_cache_query ON public.search_cache(query);
CREATE INDEX IF NOT EXISTS idx_search_cache_expires ON public.search_cache(expires_at);

-- Enable RLS on search_cache
ALTER TABLE public.search_cache ENABLE ROW LEVEL SECURITY;

-- Anyone can read cache (public feature)
CREATE POLICY "Anyone can read search cache"
ON public.search_cache
FOR SELECT
USING (true);

-- Only authenticated users can write to cache
CREATE POLICY "Authenticated users can insert cache"
ON public.search_cache
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create feed_items table for home feed ordering
CREATE TABLE IF NOT EXISTS public.feed_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid REFERENCES public.tracks(id) ON DELETE CASCADE NOT NULL,
  source text NOT NULL DEFAULT 'seed',
  rank integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feed_items_rank ON public.feed_items(rank);

-- Enable RLS on feed_items
ALTER TABLE public.feed_items ENABLE ROW LEVEL SECURITY;

-- Anyone can view feed items
CREATE POLICY "Anyone can view feed items"
ON public.feed_items
FOR SELECT
USING (true);

-- Only admins can manage feed items
CREATE POLICY "Admins can manage feed items"
ON public.feed_items
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create user_provider_preferences for default provider per user
CREATE TABLE IF NOT EXISTS public.user_provider_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Enable RLS
ALTER TABLE public.user_provider_preferences ENABLE ROW LEVEL SECURITY;

-- Users can manage their own preferences
CREATE POLICY "Users can manage own provider preferences"
ON public.user_provider_preferences
FOR ALL
USING (auth.uid() = user_id);

-- Update profiles RLS to allow updating 2FA and provider fields
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);



-- ============================================================================
-- Migration: 20260115092130_unified_music_schema.sql
-- ============================================================================

-- Unified Music Search Schema Migration
-- This migration adds tables and updates existing schema for the unified music search functionality

-- Update tracks table to support canonical track shape with arrays
ALTER TABLE public.tracks 
ADD COLUMN IF NOT EXISTS artists text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS provider_ids jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS provider_links jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS popularity_score integer DEFAULT 0;

-- Update tracks to populate artists array from artist column where not already set
UPDATE public.tracks 
SET artists = ARRAY[artist]::text[]
WHERE artists = '{}' AND artist IS NOT NULL;

-- Create track_provider_links table for normalized provider-specific data
CREATE TABLE IF NOT EXISTS public.track_provider_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid REFERENCES public.tracks(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL CHECK (provider IN ('spotify', 'apple_music', 'deezer', 'soundcloud', 'youtube', 'amazon_music')),
  provider_track_id text NOT NULL,
  url_web text,
  url_app text,
  url_preview text,
  availability jsonb DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(track_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_track_provider_links_track ON public.track_provider_links(track_id);
CREATE INDEX IF NOT EXISTS idx_track_provider_links_provider ON public.track_provider_links(provider);

-- Enable RLS
ALTER TABLE public.track_provider_links ENABLE ROW LEVEL SECURITY;

-- Anyone can view provider links
CREATE POLICY "Anyone can view provider links"
ON public.track_provider_links
FOR SELECT
USING (true);

-- Authenticated users can manage provider links
CREATE POLICY "Authenticated can manage provider links"
ON public.track_provider_links
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Create play_events table for tracking user play actions
CREATE TABLE IF NOT EXISTS public.play_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id uuid REFERENCES public.tracks(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL,
  action text NOT NULL CHECK (action IN ('open_app', 'open_web', 'preview')),
  played_at timestamptz NOT NULL DEFAULT now(),
  context text,
  device text,
  metadata jsonb DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_play_events_user ON public.play_events(user_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_play_events_track ON public.play_events(track_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_play_events_provider ON public.play_events(provider);

-- Enable RLS
ALTER TABLE public.play_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own play events
CREATE POLICY "Users can view own play events"
ON public.play_events
FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

-- Users can insert play events
CREATE POLICY "Users can insert play events"
ON public.play_events
FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Admins can view all play events
CREATE POLICY "Admins can view all play events"
ON public.play_events
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create track_connections table for WhoSampled-style relationships
CREATE TABLE IF NOT EXISTS public.track_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_track_id uuid REFERENCES public.tracks(id) ON DELETE CASCADE NOT NULL,
  to_track_id uuid REFERENCES public.tracks(id) ON DELETE CASCADE NOT NULL,
  connection_type text NOT NULL CHECK (connection_type IN ('sample', 'cover', 'interpolation', 'remix', 'inspiration')),
  confidence decimal(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  evidence_url text,
  evidence_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(from_track_id, to_track_id, connection_type)
);

CREATE INDEX IF NOT EXISTS idx_track_connections_from ON public.track_connections(from_track_id);
CREATE INDEX IF NOT EXISTS idx_track_connections_to ON public.track_connections(to_track_id);

-- Enable RLS
ALTER TABLE public.track_connections ENABLE ROW LEVEL SECURITY;

-- Anyone can view connections
CREATE POLICY "Anyone can view connections"
ON public.track_connections
FOR SELECT
USING (true);

-- Authenticated users can create connections
CREATE POLICY "Authenticated can create connections"
ON public.track_connections
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Admins and creators can update/delete connections
CREATE POLICY "Admins and creators can manage connections"
ON public.track_connections
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR created_by = auth.uid());

-- Update search_cache to handle longer TTL and add market index
DROP INDEX IF EXISTS idx_search_cache_query;
CREATE INDEX IF NOT EXISTS idx_search_cache_query_market ON public.search_cache(query, market);

-- Add function to clean expired cache entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.search_cache WHERE expires_at < now();
END;
$$;

-- Add trigger to update track popularity based on play events
CREATE OR REPLACE FUNCTION public.update_track_popularity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.tracks
  SET popularity_score = (
    SELECT COUNT(*) 
    FROM public.play_events 
    WHERE track_id = NEW.track_id 
    AND played_at > now() - interval '30 days'
  )
  WHERE id = NEW.track_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_play_event_update_popularity
  AFTER INSERT ON public.play_events
  FOR EACH ROW EXECUTE FUNCTION public.update_track_popularity();

-- Update user_providers to support more providers and encrypted tokens
ALTER TABLE public.user_providers
DROP CONSTRAINT IF EXISTS user_providers_provider_check;

ALTER TABLE public.user_providers
ADD CONSTRAINT user_providers_provider_check
CHECK (provider IN ('spotify', 'apple_music', 'deezer', 'soundcloud', 'youtube', 'amazon_music', 'lastfm'));

-- Add indices for better query performance
CREATE INDEX IF NOT EXISTS idx_tracks_isrc_artists ON public.tracks(isrc, artists) WHERE isrc IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tracks_title_artist ON public.tracks USING gin(to_tsvector('english', title || ' ' || COALESCE(artist, '')));
CREATE INDEX IF NOT EXISTS idx_tracks_popularity ON public.tracks(popularity_score DESC);


-- ============================================================================
-- Migration: 20260117165737_58521ad8-f29a-48ec-b38b-292f2369be61.sql
-- ============================================================================

-- Create track_comments table for comments on tracks
CREATE TABLE public.track_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.track_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_locations table for opt-in location sharing
CREATE TABLE public.user_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  sharing_enabled BOOLEAN NOT NULL DEFAULT true,
  radius_km INTEGER NOT NULL DEFAULT 50,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create nearby_listeners cache table
CREATE TABLE public.nearby_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  track_id UUID NOT NULL,
  artist TEXT,
  listened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.track_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nearby_activity ENABLE ROW LEVEL SECURITY;

-- Comments policies
CREATE POLICY "Anyone can view comments" ON public.track_comments 
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comments" ON public.track_comments 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" ON public.track_comments 
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON public.track_comments 
FOR DELETE USING (auth.uid() = user_id);

-- User locations policies (opt-in only visible to those who also share)
CREATE POLICY "Users can manage own location" ON public.user_locations 
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users who share can see others who share" ON public.user_locations 
FOR SELECT USING (
  sharing_enabled = true 
  AND EXISTS (
    SELECT 1 FROM public.user_locations ul 
    WHERE ul.user_id = auth.uid() 
    AND ul.sharing_enabled = true
  )
);

-- Nearby activity policies
CREATE POLICY "Users can record own activity" ON public.nearby_activity 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users who share location can see nearby activity" ON public.nearby_activity 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_locations ul 
    WHERE ul.user_id = auth.uid() 
    AND ul.sharing_enabled = true
  )
);

-- Indexes for performance
CREATE INDEX idx_track_comments_track_id ON public.track_comments(track_id);
CREATE INDEX idx_track_comments_parent_id ON public.track_comments(parent_id);
CREATE INDEX idx_nearby_activity_track_id ON public.nearby_activity(track_id);
CREATE INDEX idx_nearby_activity_artist ON public.nearby_activity(artist);
CREATE INDEX idx_user_locations_coords ON public.user_locations(latitude, longitude);

-- Triggers for updated_at
CREATE TRIGGER update_track_comments_updated_at
BEFORE UPDATE ON public.track_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_user_locations_updated_at
BEFORE UPDATE ON public.user_locations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();



-- ============================================================================
-- Migration: 20260118065431_c2bd75bd-b63c-4560-bc4c-0f96e698af9d.sql
-- ============================================================================

-- Create user_follows table for social following
CREATE TABLE public.user_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Enable RLS
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_user_follows_follower ON public.user_follows(follower_id);
CREATE INDEX idx_user_follows_following ON public.user_follows(following_id);

-- RLS Policies
CREATE POLICY "Users can view all follows"
ON public.user_follows
FOR SELECT
USING (true);

CREATE POLICY "Users can follow others"
ON public.user_follows
FOR INSERT
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
ON public.user_follows
FOR DELETE
USING (auth.uid() = follower_id);

-- Create play_history table to track what users are listening to
CREATE TABLE public.play_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  played_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  duration_ms INTEGER, -- How long they listened
  source TEXT DEFAULT 'feed' -- Where they played from
);

-- Enable RLS
ALTER TABLE public.play_history ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_play_history_user ON public.play_history(user_id);
CREATE INDEX idx_play_history_track ON public.play_history(track_id);
CREATE INDEX idx_play_history_played_at ON public.play_history(played_at DESC);

-- RLS Policies
CREATE POLICY "Users can view their own play history"
ON public.play_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view followed users play history"
ON public.play_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_follows
    WHERE follower_id = auth.uid() AND following_id = play_history.user_id
  )
);

CREATE POLICY "Users can record their own plays"
ON public.play_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);



-- ============================================================================
-- Migration: 20260120_add_track_sections.sql
-- ============================================================================

-- Track sections (canonical, provider-agnostic)
-- Enables seek-based playback for intro/verse/chorus/bridge/outro

create table public.track_sections (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks(id) on delete cascade,
  label text not null check (label in ('intro', 'verse', 'pre-chorus', 'chorus', 'bridge', 'outro', 'breakdown', 'drop')),
  start_ms integer not null check (start_ms >= 0),
  end_ms integer not null check (end_ms > start_ms),
  created_at timestamptz not null default now()
);

-- Performance indexes
create index idx_track_sections_track_id on public.track_sections(track_id);
create index idx_track_sections_label on public.track_sections(label);

-- RLS
alter table public.track_sections enable row level security;

-- Anyone can read sections (no privacy risk)
create policy "public read track sections"
on public.track_sections
for select
using (true);

-- Only service role / server may write (no client writes)
create policy "no client writes"
on public.track_sections
for all
using (false)
with check (false);

-- RPC function for fetching track sections (typed access from client)
create or replace function public.get_track_sections(p_track_id uuid)
returns table (
  id uuid,
  track_id uuid,
  label text,
  start_ms integer,
  end_ms integer,
  created_at timestamptz
)
language sql
stable
security definer
as $$
  select id, track_id, label, start_ms, end_ms, created_at
  from public.track_sections
  where track_id = p_track_id
  order by start_ms asc;
$$;

comment on table public.track_sections is 'Canonical song structure sections with timestamps for seek-based playback';
comment on column public.track_sections.label is 'Section type: intro, verse, pre-chorus, chorus, bridge, outro, breakdown, drop';
comment on column public.track_sections.start_ms is 'Section start time in milliseconds';
comment on column public.track_sections.end_ms is 'Section end time in milliseconds';
comment on function public.get_track_sections is 'Fetch all sections for a track, ordered by start time';


-- ============================================================================
-- Migration: 20260120_secure_2fa_secrets.sql
-- ============================================================================

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


-- ============================================================================
-- Migration: 20260120091200_add_sections_to_tracks.sql
-- ============================================================================

-- Add sections column to tracks table for song structure data
ALTER TABLE public.tracks
ADD COLUMN sections JSONB;

-- Add comment to describe the column
COMMENT ON COLUMN public.tracks.sections IS 'Array of song sections with timestamps: [{type: "intro"|"verse"|"chorus"|"bridge"|"outro", label: string, start_time: number, end_time?: number}]';


-- ============================================================================
-- Migration: 20260120201900_fix_user_locations_rls.sql
-- ============================================================================

-- Fix infinite recursion in user_locations RLS policy
-- by creating a SECURITY DEFINER function that bypasses RLS

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users who share can see others who share" ON public.user_locations;

-- Create a SECURITY DEFINER function to check if current user has sharing enabled
-- This function bypasses RLS to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.user_has_sharing_enabled()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT sharing_enabled 
     FROM public.user_locations 
     WHERE user_id = auth.uid() 
     LIMIT 1),
    false
  );
$$;

-- Recreate the policy using the SECURITY DEFINER function
CREATE POLICY "Users who share can see others who share" ON public.user_locations 
FOR SELECT USING (
  sharing_enabled = true 
  AND public.user_has_sharing_enabled()
);

-- Add comment explaining the function
COMMENT ON FUNCTION public.user_has_sharing_enabled() IS 
'SECURITY DEFINER function to check if the current user has location sharing enabled. Bypasses RLS to prevent infinite recursion in user_locations SELECT policy.';


-- ============================================================================
-- Migration: 20260120202800_critical_security_fixes.sql
-- ============================================================================

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


-- ============================================================================
-- Migration: 20260122_emoji_reactions.sql
-- ============================================================================

-- Emoji Reactions System
-- Allows users to react to posts and comments with emojis

-- ============================================================================
-- 1. REACTION TYPES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS reaction_types (
  id TEXT PRIMARY KEY,
  emoji TEXT NOT NULL,
  label TEXT NOT NULL,
  category TEXT CHECK (category IN ('positive', 'funny', 'love', 'thinking', 'surprised', 'sad', 'angry')),
  display_order INTEGER DEFAULT 0
);

-- Insert default reaction types
INSERT INTO reaction_types (id, emoji, label, category, display_order) VALUES
  ('like', '👍', 'Like', 'positive', 1),
  ('love', '❤️', 'Love', 'love', 2),
  ('fire', '🔥', 'Fire', 'positive', 3),
  ('laugh', '😂', 'Laugh', 'funny', 4),
  ('wow', '😮', 'Wow', 'surprised', 5),
  ('think', '🤔', 'Thinking', 'thinking', 6),
  ('clap', '👏', 'Applause', 'positive', 7),
  ('heart_eyes', '😍', 'Love It', 'love', 8),
  ('mind_blown', '🤯', 'Mind Blown', 'surprised', 9),
  ('cry_laugh', '😭', 'Crying Laughing', 'funny', 10),
  ('rocket', '🚀', 'Rocket', 'positive', 11),
  ('musical_note', '🎵', 'Musical', 'positive', 12),
  ('star', '⭐', 'Star', 'positive', 13),
  ('celebrate', '🎉', 'Celebrate', 'positive', 14),
  ('sad', '😢', 'Sad', 'sad', 15),
  ('angry', '😠', 'Angry', 'angry', 16)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. POST REACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS forum_post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_id TEXT NOT NULL REFERENCES reaction_types(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(post_id, user_id, reaction_id)
);

CREATE INDEX idx_post_reactions_post ON forum_post_reactions(post_id);
CREATE INDEX idx_post_reactions_user ON forum_post_reactions(user_id);

-- ============================================================================
-- 3. COMMENT REACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS forum_comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES forum_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_id TEXT NOT NULL REFERENCES reaction_types(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(comment_id, user_id, reaction_id)
);

CREATE INDEX idx_comment_reactions_comment ON forum_comment_reactions(comment_id);
CREATE INDEX idx_comment_reactions_user ON forum_comment_reactions(user_id);

-- ============================================================================
-- 4. REACTION FUNCTIONS
-- ============================================================================

-- Toggle post reaction
CREATE OR REPLACE FUNCTION toggle_post_reaction(
  p_post_id UUID,
  p_user_id UUID,
  p_reaction_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Check if reaction exists
  SELECT EXISTS(
    SELECT 1 FROM forum_post_reactions
    WHERE post_id = p_post_id
      AND user_id = p_user_id
      AND reaction_id = p_reaction_id
  ) INTO v_exists;
  
  IF v_exists THEN
    -- Remove reaction
    DELETE FROM forum_post_reactions
    WHERE post_id = p_post_id
      AND user_id = p_user_id
      AND reaction_id = p_reaction_id;
    RETURN FALSE;
  ELSE
    -- Add reaction
    INSERT INTO forum_post_reactions (post_id, user_id, reaction_id)
    VALUES (p_post_id, p_user_id, p_reaction_id)
    ON CONFLICT DO NOTHING;
    RETURN TRUE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Toggle comment reaction
CREATE OR REPLACE FUNCTION toggle_comment_reaction(
  p_comment_id UUID,
  p_user_id UUID,
  p_reaction_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM forum_comment_reactions
    WHERE comment_id = p_comment_id
      AND user_id = p_user_id
      AND reaction_id = p_reaction_id
  ) INTO v_exists;
  
  IF v_exists THEN
    DELETE FROM forum_comment_reactions
    WHERE comment_id = p_comment_id
      AND user_id = p_user_id
      AND reaction_id = p_reaction_id;
    RETURN FALSE;
  ELSE
    INSERT INTO forum_comment_reactions (comment_id, user_id, reaction_id)
    VALUES (p_comment_id, p_user_id, p_reaction_id)
    ON CONFLICT DO NOTHING;
    RETURN TRUE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Get post reactions summary
CREATE OR REPLACE FUNCTION get_post_reactions(p_post_id UUID)
RETURNS TABLE (
  reaction_id TEXT,
  emoji TEXT,
  count BIGINT,
  user_reacted BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rt.id,
    rt.emoji,
    COUNT(fpr.id)::BIGINT,
    BOOL_OR(fpr.user_id = auth.uid()) as user_reacted
  FROM reaction_types rt
  LEFT JOIN forum_post_reactions fpr ON fpr.reaction_id = rt.id AND fpr.post_id = p_post_id
  WHERE EXISTS (
    SELECT 1 FROM forum_post_reactions 
    WHERE post_id = p_post_id AND reaction_id = rt.id
  )
  GROUP BY rt.id, rt.emoji, rt.display_order
  ORDER BY COUNT(fpr.id) DESC, rt.display_order;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get comment reactions summary
CREATE OR REPLACE FUNCTION get_comment_reactions(p_comment_id UUID)
RETURNS TABLE (
  reaction_id TEXT,
  emoji TEXT,
  count BIGINT,
  user_reacted BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rt.id,
    rt.emoji,
    COUNT(fcr.id)::BIGINT,
    BOOL_OR(fcr.user_id = auth.uid()) as user_reacted
  FROM reaction_types rt
  LEFT JOIN forum_comment_reactions fcr ON fcr.reaction_id = rt.id AND fcr.comment_id = p_comment_id
  WHERE EXISTS (
    SELECT 1 FROM forum_comment_reactions 
    WHERE comment_id = p_comment_id AND reaction_id = rt.id
  )
  GROUP BY rt.id, rt.emoji, rt.display_order
  ORDER BY COUNT(fcr.id) DESC, rt.display_order;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 5. RLS POLICIES
-- ============================================================================

ALTER TABLE forum_post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_comment_reactions ENABLE ROW LEVEL SECURITY;

-- Anyone can view reactions
CREATE POLICY "post_reactions_select" ON forum_post_reactions
  FOR SELECT USING (true);

CREATE POLICY "comment_reactions_select" ON forum_comment_reactions
  FOR SELECT USING (true);

-- Users can manage their own reactions
CREATE POLICY "post_reactions_insert" ON forum_post_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "post_reactions_delete" ON forum_post_reactions
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "comment_reactions_insert" ON forum_comment_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comment_reactions_delete" ON forum_comment_reactions
  FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE forum_post_reactions IS 'Emoji reactions to forum posts';
COMMENT ON TABLE forum_comment_reactions IS 'Emoji reactions to comments';
COMMENT ON FUNCTION toggle_post_reaction IS 'Toggle reaction on post (add if not exists, remove if exists)';
COMMENT ON FUNCTION get_post_reactions IS 'Get reaction summary for a post with counts';


-- ============================================================================
-- Migration: 20260122_live_chat.sql
-- ============================================================================

-- Live Real-time Chat System
-- Enables users to chat with each other in real-time while listening to music

-- Chat rooms table (can be global, per track, or per user group)
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('global', 'track', 'group', 'direct')),
  track_id TEXT, -- For track-specific chat rooms
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  reply_to UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb, -- For reactions, mentions, etc.
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Chat room members (who's in which room)
CREATE TABLE IF NOT EXISTS chat_room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'moderator', 'member')),
  last_read_at TIMESTAMPTZ DEFAULT now(),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- User online status
CREATE TABLE IF NOT EXISTS user_presence (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'away', 'offline')),
  current_track_id TEXT,
  last_seen TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created ON chat_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_room_members_room ON chat_room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_room_members_user ON chat_room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_type ON chat_rooms(type);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_track ON chat_rooms(track_id) WHERE track_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status) WHERE status = 'online';

-- Enable Row Level Security
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_rooms
CREATE POLICY "Users can view public chat rooms"
  ON chat_rooms FOR SELECT
  USING (type IN ('global', 'track'));

CREATE POLICY "Users can view rooms they're members of"
  ON chat_rooms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_room_members
      WHERE chat_room_members.room_id = chat_rooms.id
      AND chat_room_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create chat rooms"
  ON chat_rooms FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their rooms"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_room_members
      WHERE chat_room_members.room_id = chat_messages.room_id
      AND chat_room_members.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM chat_rooms
      WHERE chat_rooms.id = chat_messages.room_id
      AND chat_rooms.type IN ('global', 'track')
    )
  );

CREATE POLICY "Users can send messages to their rooms"
  ON chat_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM chat_room_members
        WHERE chat_room_members.room_id = chat_messages.room_id
        AND chat_room_members.user_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM chat_rooms
        WHERE chat_rooms.id = chat_messages.room_id
        AND chat_rooms.type IN ('global', 'track')
      )
    )
  );

CREATE POLICY "Users can edit their own messages"
  ON chat_messages FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own messages"
  ON chat_messages FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for chat_room_members
CREATE POLICY "Users can view room members"
  ON chat_room_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM chat_room_members AS crm
      WHERE crm.room_id = chat_room_members.room_id
      AND crm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join public rooms"
  ON chat_room_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM chat_rooms
      WHERE chat_rooms.id = chat_room_members.room_id
      AND chat_rooms.type IN ('global', 'track')
    )
  );

CREATE POLICY "Users can leave rooms"
  ON chat_room_members FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for user_presence
CREATE POLICY "Users can view all presence"
  ON user_presence FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own presence"
  ON user_presence FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own presence status"
  ON user_presence FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_chat_rooms_updated_at
  BEFORE UPDATE ON chat_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_updated_at();

CREATE TRIGGER update_user_presence_updated_at
  BEFORE UPDATE ON user_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_updated_at();

-- Create a global chat room by default
INSERT INTO chat_rooms (name, type, metadata)
VALUES ('Global Chat', 'global', '{"description": "Chat with everyone on CladeAI"}'::jsonb)
ON CONFLICT DO NOTHING;

-- Function to get unread message count
CREATE OR REPLACE FUNCTION get_unread_count(p_room_id UUID, p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM chat_messages cm
  WHERE cm.room_id = p_room_id
  AND cm.created_at > COALESCE(
    (SELECT last_read_at FROM chat_room_members WHERE room_id = p_room_id AND user_id = p_user_id),
    '1970-01-01'::timestamptz
  );
$$ LANGUAGE sql STABLE;

-- Function to mark room as read
CREATE OR REPLACE FUNCTION mark_room_as_read(p_room_id UUID)
RETURNS void AS $$
  INSERT INTO chat_room_members (room_id, user_id, last_read_at)
  VALUES (p_room_id, auth.uid(), now())
  ON CONFLICT (room_id, user_id)
  DO UPDATE SET last_read_at = now();
$$ LANGUAGE sql;

COMMENT ON TABLE chat_rooms IS 'Chat rooms for different contexts (global, track-specific, groups)';
COMMENT ON TABLE chat_messages IS 'Real-time chat messages between users';
COMMENT ON TABLE chat_room_members IS 'Tracks which users are in which rooms';
COMMENT ON TABLE user_presence IS 'Real-time user online status and current activity';


-- ============================================================================
-- Migration: 20260122_optimize_indexes.sql
-- ============================================================================

-- Database Optimization: Add Performance Indexes
-- Created: 2026-01-22
-- Purpose: Improve query performance for common operations

-- Tracks table indexes
CREATE INDEX IF NOT EXISTS idx_tracks_title_trgm ON public.tracks USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tracks_artist_trgm ON public.tracks USING gin(artist gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tracks_genre ON public.tracks(genre) WHERE genre IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tracks_energy ON public.tracks(energy) WHERE energy IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tracks_tempo ON public.tracks(tempo) WHERE tempo IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tracks_detected_key_mode ON public.tracks(detected_key, detected_mode);
CREATE INDEX IF NOT EXISTS idx_tracks_progression_gin ON public.tracks USING gin(progression_roman);
CREATE INDEX IF NOT EXISTS idx_tracks_is_common_ancestor ON public.tracks(is_common_ancestor) WHERE is_common_ancestor = true;

-- Play history indexes
CREATE INDEX IF NOT EXISTS idx_play_history_user_played_at ON public.play_history(user_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_play_history_track_played_at ON public.play_history(track_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_play_history_recent ON public.play_history(played_at DESC) WHERE played_at > NOW() - INTERVAL '30 days';

-- User interactions indexes
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_type ON public.user_interactions(user_id, interaction_type);
CREATE INDEX IF NOT EXISTS idx_user_interactions_track_type ON public.user_interactions(track_id, interaction_type);
CREATE INDEX IF NOT EXISTS idx_user_interactions_created_at ON public.user_interactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_interactions_flags ON public.user_interactions(interaction_type) WHERE interaction_type = 'flag' AND resolved_at IS NULL;

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm ON public.profiles USING gin(username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);

-- Feed items indexes
CREATE INDEX IF NOT EXISTS idx_feed_items_user_posted ON public.feed_items(user_id, posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_items_posted_at ON public.feed_items(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_items_track ON public.feed_items(track_id) WHERE track_id IS NOT NULL;

-- User providers indexes
CREATE INDEX IF NOT EXISTS idx_user_providers_user_provider ON public.user_providers(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_user_providers_connected_at ON public.user_providers(connected_at DESC);

-- Search cache indexes (already exists, but ensure)
CREATE INDEX IF NOT EXISTS idx_search_cache_expires_at ON public.search_cache(expires_at) WHERE expires_at > NOW();

-- Analyze tables to update statistics
ANALYZE public.tracks;
ANALYZE public.play_history;
ANALYZE public.user_interactions;
ANALYZE public.profiles;
ANALYZE public.feed_items;
ANALYZE public.user_providers;

-- Create materialized view for track statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS public.track_stats AS
SELECT 
  t.id,
  t.title,
  t.artist,
  COUNT(DISTINCT ph.user_id) as unique_listeners,
  COUNT(ph.id) as total_plays,
  COUNT(DISTINCT CASE WHEN ui.interaction_type = 'like' THEN ui.user_id END) as total_likes,
  COUNT(DISTINCT CASE WHEN ui.interaction_type = 'save' THEN ui.user_id END) as total_saves,
  MAX(ph.played_at) as last_played_at
FROM public.tracks t
LEFT JOIN public.play_history ph ON ph.track_id = t.id
LEFT JOIN public.user_interactions ui ON ui.track_id = t.id
GROUP BY t.id, t.title, t.artist;

CREATE UNIQUE INDEX IF NOT EXISTS idx_track_stats_id ON public.track_stats(id);
CREATE INDEX IF NOT EXISTS idx_track_stats_plays ON public.track_stats(total_plays DESC);
CREATE INDEX IF NOT EXISTS idx_track_stats_listeners ON public.track_stats(unique_listeners DESC);

-- Create refresh function for track stats
CREATE OR REPLACE FUNCTION public.refresh_track_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.track_stats;
END;
$$;

-- Grant permissions
GRANT SELECT ON public.track_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_track_stats() TO authenticated;

-- Enable pg_trgm extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

COMMENT ON INDEX idx_tracks_title_trgm IS 'Trigram index for fast fuzzy text search on track titles';
COMMENT ON INDEX idx_tracks_progression_gin IS 'GIN index for array containment searches on chord progressions';
COMMENT ON MATERIALIZED VIEW public.track_stats IS 'Pre-computed track statistics for analytics dashboard';


-- ============================================================================
-- Migration: 20260122_performance_optimization.sql
-- ============================================================================

-- Performance Optimization for 1M+ Users
-- Indexes, partitioning, materialized views, and caching strategies

-- ============================================================================
-- 1. ADVANCED INDEXES FOR HIGH-TRAFFIC TABLES
-- ============================================================================

-- Profiles table - composite indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_country_created 
ON profiles(country, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_personality_location 
ON profiles(personality_type, country);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_search_name 
ON profiles USING gin(to_tsvector('english', full_name || ' ' || username));

-- Forum posts - composite indexes for hot/new/top sorting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_posts_hot 
ON forum_posts(forum_id, vote_count DESC, created_at DESC) 
WHERE NOT is_deleted;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_posts_new 
ON forum_posts(forum_id, created_at DESC) 
WHERE NOT is_deleted;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_posts_top_week 
ON forum_posts(forum_id, vote_count DESC) 
WHERE created_at > NOW() - INTERVAL '7 days' AND NOT is_deleted;

-- Forum comments - covering index for thread loading
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_comments_thread 
ON forum_comments(post_id, parent_comment_id, created_at ASC) 
INCLUDE (user_id, content, vote_count, is_deleted);

-- Forum votes - partial indexes for active users
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_votes_user_recent 
ON forum_votes(user_id, created_at DESC) 
WHERE created_at > NOW() - INTERVAL '30 days';

-- Chat messages - partitioned index for real-time performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_messages_room_time 
ON chat_messages(room_id, created_at DESC) 
WHERE created_at > NOW() - INTERVAL '7 days';

-- Track comments - composite for popular tracks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_track_comments_popular 
ON track_comments(track_id, likes_count DESC, created_at DESC) 
WHERE NOT is_deleted;

-- ============================================================================
-- 2. TABLE PARTITIONING FOR TIME-SERIES DATA
-- ============================================================================

-- Partition chat_messages by month (keeps queries fast)
CREATE TABLE IF NOT EXISTS chat_messages_partitioned (
  LIKE chat_messages INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create partitions for past year and next month
DO $$
DECLARE
  start_date DATE := DATE_TRUNC('month', NOW() - INTERVAL '12 months');
  end_date DATE := DATE_TRUNC('month', NOW() + INTERVAL '2 months');
  partition_date DATE;
  partition_name TEXT;
BEGIN
  partition_date := start_date;
  WHILE partition_date < end_date LOOP
    partition_name := 'chat_messages_' || TO_CHAR(partition_date, 'YYYY_MM');
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS %I PARTITION OF chat_messages_partitioned
       FOR VALUES FROM (%L) TO (%L)',
      partition_name,
      partition_date,
      partition_date + INTERVAL '1 month'
    );
    partition_date := partition_date + INTERVAL '1 month';
  END LOOP;
END $$;

-- Partition forum_posts by quarter for historical data
CREATE TABLE IF NOT EXISTS forum_posts_partitioned (
  LIKE forum_posts INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- ============================================================================
-- 3. MATERIALIZED VIEWS FOR EXPENSIVE QUERIES
-- ============================================================================

-- Hot posts cache (refresh every 5 minutes)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_hot_posts AS
SELECT 
  p.*,
  f.name as forum_name,
  f.display_name as forum_display_name,
  pr.username,
  pr.display_name as user_display_name,
  pr.avatar_url,
  -- Hot score calculation: (upvotes - downvotes) / (age_hours + 2)^1.5
  (p.vote_count::float / POWER(EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600 + 2, 1.5)) as hot_score
FROM forum_posts p
JOIN forums f ON f.id = p.forum_id
JOIN profiles pr ON pr.id = p.user_id
WHERE p.created_at > NOW() - INTERVAL '7 days'
  AND NOT p.is_deleted
ORDER BY hot_score DESC
LIMIT 500;

CREATE UNIQUE INDEX ON mv_hot_posts (id);
CREATE INDEX ON mv_hot_posts (hot_score DESC);

-- Top contributors cache (refresh hourly)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_top_contributors AS
SELECT 
  p.id,
  p.username,
  p.display_name,
  p.avatar_url,
  COUNT(DISTINCT fp.id) as post_count,
  COUNT(DISTINCT fc.id) as comment_count,
  SUM(fp.vote_count) + SUM(fc.vote_count) as total_karma,
  COUNT(DISTINCT fm.forum_id) as forum_count
FROM profiles p
LEFT JOIN forum_posts fp ON fp.user_id = p.id AND fp.created_at > NOW() - INTERVAL '30 days'
LEFT JOIN forum_comments fc ON fc.user_id = p.id AND fc.created_at > NOW() - INTERVAL '30 days'
LEFT JOIN forum_members fm ON fm.user_id = p.id
GROUP BY p.id
HAVING COUNT(DISTINCT fp.id) > 0 OR COUNT(DISTINCT fc.id) > 0
ORDER BY total_karma DESC
LIMIT 100;

CREATE UNIQUE INDEX ON mv_top_contributors (id);

-- Forum stats cache (refresh every 15 minutes)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_forum_stats AS
SELECT 
  f.*,
  COUNT(DISTINCT fm.user_id) as actual_member_count,
  COUNT(DISTINCT fp.id) as actual_post_count,
  COUNT(DISTINCT fp.id) FILTER (WHERE fp.created_at > NOW() - INTERVAL '24 hours') as posts_24h,
  COUNT(DISTINCT fp.id) FILTER (WHERE fp.created_at > NOW() - INTERVAL '7 days') as posts_7d,
  AVG(fp.vote_count)::int as avg_post_votes
FROM forums f
LEFT JOIN forum_members fm ON fm.forum_id = f.id
LEFT JOIN forum_posts fp ON fp.forum_id = f.id
GROUP BY f.id;

CREATE UNIQUE INDEX ON mv_forum_stats (id);
CREATE INDEX ON mv_forum_stats (posts_24h DESC);

-- ============================================================================
-- 4. REFRESH FUNCTIONS FOR MATERIALIZED VIEWS
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_hot_posts()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_hot_posts;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_top_contributors()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_contributors;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_forum_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_forum_stats;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. CONNECTION POOLING & PREPARED STATEMENTS
-- ============================================================================

-- Set optimal connection settings
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '2GB';
ALTER SYSTEM SET effective_cache_size = '6GB';
ALTER SYSTEM SET maintenance_work_mem = '512MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET work_mem = '10MB';
ALTER SYSTEM SET min_wal_size = '1GB';
ALTER SYSTEM SET max_wal_size = '4GB';

-- ============================================================================
-- 6. QUERY OPTIMIZATION FUNCTIONS
-- ============================================================================

-- Efficient hot posts query (uses materialized view)
CREATE OR REPLACE FUNCTION get_hot_posts(
  p_forum_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 25,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  forum_id UUID,
  title TEXT,
  content TEXT,
  vote_count INTEGER,
  comment_count INTEGER,
  created_at TIMESTAMPTZ,
  hot_score FLOAT,
  forum_name TEXT,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    hp.id,
    hp.forum_id,
    hp.title,
    hp.content,
    hp.vote_count,
    hp.comment_count,
    hp.created_at,
    hp.hot_score,
    hp.forum_name,
    hp.username,
    hp.user_display_name,
    hp.avatar_url
  FROM mv_hot_posts hp
  WHERE p_forum_id IS NULL OR hp.forum_id = p_forum_id
  ORDER BY hp.hot_score DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Efficient comment thread loading (single query, no N+1)
CREATE OR REPLACE FUNCTION get_comment_thread(
  p_post_id UUID,
  p_max_depth INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  parent_comment_id UUID,
  user_id UUID,
  content TEXT,
  vote_count INTEGER,
  created_at TIMESTAMPTZ,
  depth INTEGER,
  path TEXT,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE comment_tree AS (
    -- Base case: top-level comments
    SELECT 
      c.id,
      c.parent_comment_id,
      c.user_id,
      c.content,
      c.vote_count,
      c.created_at,
      0 as depth,
      c.id::TEXT as path,
      p.username,
      p.display_name,
      p.avatar_url
    FROM forum_comments c
    JOIN profiles p ON p.id = c.user_id
    WHERE c.post_id = p_post_id 
      AND c.parent_comment_id IS NULL
      AND NOT c.is_deleted
    
    UNION ALL
    
    -- Recursive case: child comments
    SELECT 
      c.id,
      c.parent_comment_id,
      c.user_id,
      c.content,
      c.vote_count,
      c.created_at,
      ct.depth + 1,
      ct.path || '/' || c.id::TEXT,
      p.username,
      p.display_name,
      p.avatar_url
    FROM forum_comments c
    JOIN profiles p ON p.id = c.user_id
    JOIN comment_tree ct ON c.parent_comment_id = ct.id
    WHERE ct.depth < p_max_depth AND NOT c.is_deleted
  )
  SELECT * FROM comment_tree
  ORDER BY path, created_at ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 7. CACHING LAYER WITH REDIS-COMPATIBLE TABLES
-- ============================================================================

-- Cache table for hot data (TTL-based)
CREATE TABLE IF NOT EXISTS cache_entries (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache_entries(expires_at) 
WHERE expires_at > NOW();

-- Auto-cleanup expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM cache_entries WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. RATE LIMITING WITH SLIDING WINDOW
-- ============================================================================

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  UNIQUE(user_id, action, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action 
ON rate_limits(user_id, action, window_start DESC);

-- Rate limit check with sliding window
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_action TEXT,
  p_max_count INTEGER,
  p_window_seconds INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_total_count INTEGER;
BEGIN
  v_window_start := DATE_TRUNC('minute', NOW());
  
  -- Count recent actions in sliding window
  SELECT COALESCE(SUM(count), 0) INTO v_total_count
  FROM rate_limits
  WHERE user_id = p_user_id
    AND action = p_action
    AND window_start > NOW() - INTERVAL '1 second' * p_window_seconds;
  
  -- Check if under limit
  IF v_total_count >= p_max_count THEN
    RETURN FALSE;
  END IF;
  
  -- Increment counter
  INSERT INTO rate_limits (user_id, action, window_start, count)
  VALUES (p_user_id, p_action, v_window_start, 1)
  ON CONFLICT (user_id, action, window_start)
  DO UPDATE SET count = rate_limits.count + 1;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Cleanup old rate limit entries (run hourly)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits 
  WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. STATISTICS AND MONITORING
-- ============================================================================

-- Update table statistics for better query planning
ANALYZE profiles;
ANALYZE forum_posts;
ANALYZE forum_comments;
ANALYZE forum_votes;
ANALYZE chat_messages;
ANALYZE track_comments;

-- Create monitoring view for slow queries
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
  query,
  calls,
  total_exec_time / 1000 as total_time_sec,
  mean_exec_time / 1000 as mean_time_sec,
  max_exec_time / 1000 as max_time_sec
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY total_exec_time DESC
LIMIT 50;

-- ============================================================================
-- 10. AUTOMATED MAINTENANCE JOBS
-- ============================================================================

-- Schedule via pg_cron or external scheduler:
-- Every 5 minutes: refresh hot posts
-- Every 15 minutes: refresh forum stats
-- Every hour: refresh top contributors, cleanup rate limits, cleanup cache
-- Daily: vacuum analyze, update statistics

-- Example pg_cron setup (if available):
-- SELECT cron.schedule('refresh-hot-posts', '*/5 * * * *', 'SELECT refresh_hot_posts()');
-- SELECT cron.schedule('refresh-forum-stats', '*/15 * * * *', 'SELECT refresh_forum_stats()');
-- SELECT cron.schedule('cleanup-cache', '0 * * * *', 'SELECT cleanup_expired_cache()');
-- SELECT cron.schedule('cleanup-rate-limits', '0 * * * *', 'SELECT cleanup_old_rate_limits()');

COMMENT ON MATERIALIZED VIEW mv_hot_posts IS 
'Cached hot posts with score calculation. Refresh every 5 minutes for performance.';

COMMENT ON FUNCTION get_hot_posts IS 
'Efficient hot posts query using materialized view. Supports forum filtering and pagination.';

COMMENT ON FUNCTION get_comment_thread IS 
'Single-query comment thread loader with recursive CTE. No N+1 queries.';


-- ============================================================================
-- Migration: 20260122_performance_tracking.sql
-- ============================================================================

-- Performance Test Results Table
-- Stores automated performance test metrics for admin dashboard

CREATE TABLE IF NOT EXISTS performance_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_suite TEXT NOT NULL,
  test_name TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pass', 'fail', 'warning')),
  threshold_ms INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  tested_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_performance_tests_suite ON performance_test_results(test_suite);
CREATE INDEX IF NOT EXISTS idx_performance_tests_status ON performance_test_results(status);
CREATE INDEX IF NOT EXISTS idx_performance_tests_tested_at ON performance_test_results(tested_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_tests_name ON performance_test_results(test_name);

-- Function: Get performance trends over time
CREATE OR REPLACE FUNCTION get_performance_trends(
  p_test_name TEXT DEFAULT NULL,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  test_name TEXT,
  avg_duration NUMERIC,
  min_duration INTEGER,
  max_duration INTEGER,
  test_count BIGINT,
  pass_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ptr.test_name,
    ROUND(AVG(ptr.duration_ms)::NUMERIC, 2) as avg_duration,
    MIN(ptr.duration_ms) as min_duration,
    MAX(ptr.duration_ms) as max_duration,
    COUNT(*) as test_count,
    ROUND((COUNT(*) FILTER (WHERE ptr.status = 'pass')::NUMERIC / COUNT(*)::NUMERIC * 100), 2) as pass_rate
  FROM performance_test_results ptr
  WHERE 
    (p_test_name IS NULL OR ptr.test_name = p_test_name)
    AND ptr.tested_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY ptr.test_name
  ORDER BY avg_duration DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get slowest features
CREATE OR REPLACE FUNCTION get_slowest_features(p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
  test_name TEXT,
  test_suite TEXT,
  avg_duration NUMERIC,
  last_tested TIMESTAMPTZ,
  failure_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ptr.test_name,
    ptr.test_suite,
    ROUND(AVG(ptr.duration_ms)::NUMERIC, 2) as avg_duration,
    MAX(ptr.tested_at) as last_tested,
    COUNT(*) FILTER (WHERE ptr.status = 'fail') as failure_count
  FROM performance_test_results ptr
  WHERE ptr.tested_at >= NOW() - INTERVAL '7 days'
  GROUP BY ptr.test_name, ptr.test_suite
  ORDER BY avg_duration DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get performance summary for dashboard
CREATE OR REPLACE FUNCTION get_performance_summary()
RETURNS TABLE(
  total_tests BIGINT,
  passed_tests BIGINT,
  failed_tests BIGINT,
  warning_tests BIGINT,
  avg_duration NUMERIC,
  pass_rate NUMERIC,
  last_test_run TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_tests,
    COUNT(*) FILTER (WHERE status = 'pass') as passed_tests,
    COUNT(*) FILTER (WHERE status = 'fail') as failed_tests,
    COUNT(*) FILTER (WHERE status = 'warning') as warning_tests,
    ROUND(AVG(duration_ms)::NUMERIC, 2) as avg_duration,
    ROUND((COUNT(*) FILTER (WHERE status = 'pass')::NUMERIC / COUNT(*)::NUMERIC * 100), 2) as pass_rate,
    MAX(tested_at) as last_test_run
  FROM performance_test_results
  WHERE tested_at >= NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get test history for specific feature
CREATE OR REPLACE FUNCTION get_test_history(
  p_test_name TEXT,
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE(
  tested_at TIMESTAMPTZ,
  duration_ms INTEGER,
  status TEXT,
  threshold_ms INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ptr.tested_at,
    ptr.duration_ms,
    ptr.status,
    ptr.threshold_ms
  FROM performance_test_results ptr
  WHERE 
    ptr.test_name = p_test_name
    AND ptr.tested_at >= NOW() - (p_days || ' days')::INTERVAL
  ORDER BY ptr.tested_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE performance_test_results ENABLE ROW LEVEL SECURITY;

-- Admins can view all performance results
CREATE POLICY "Admins can view performance results"
  ON performance_test_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Service role can insert results
CREATE POLICY "Service role can insert performance results"
  ON performance_test_results FOR INSERT
  WITH CHECK (true);

-- Comments
COMMENT ON TABLE performance_test_results IS 'Automated performance test results for monitoring feature speed';
COMMENT ON FUNCTION get_performance_trends IS 'Returns performance metrics trends over specified time period';
COMMENT ON FUNCTION get_slowest_features IS 'Returns list of slowest features based on recent tests';
COMMENT ON FUNCTION get_performance_summary IS 'Returns overall performance summary for dashboard';
COMMENT ON FUNCTION get_test_history IS 'Returns historical test results for a specific feature';


-- ============================================================================
-- Migration: 20260122_playlists.sql
-- ============================================================================

-- Playlist System
-- Created: 2026-01-22
-- Purpose: User-created playlists with collaborative features

-- Create playlists table
CREATE TABLE IF NOT EXISTS public.playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  is_public boolean DEFAULT true,
  is_collaborative boolean DEFAULT false,
  cover_url text,
  cover_color text, -- Hex color for auto-generated covers
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_played_at timestamptz,
  play_count integer DEFAULT 0,
  CONSTRAINT name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100)
);

-- Create playlist_tracks table (join table)
CREATE TABLE IF NOT EXISTS public.playlist_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid REFERENCES public.playlists(id) ON DELETE CASCADE NOT NULL,
  track_id uuid REFERENCES public.tracks(id) ON DELETE CASCADE NOT NULL,
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  position integer NOT NULL DEFAULT 0,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(playlist_id, track_id)
);

-- Create playlist_collaborators table
CREATE TABLE IF NOT EXISTS public.playlist_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid REFERENCES public.playlists(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  can_edit boolean DEFAULT true,
  can_add_tracks boolean DEFAULT true,
  can_remove_tracks boolean DEFAULT true,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(playlist_id, user_id)
);

-- Create playlist_folders table
CREATE TABLE IF NOT EXISTS public.playlist_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  parent_folder_id uuid REFERENCES public.playlist_folders(id) ON DELETE CASCADE,
  position integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create playlist_folder_items table
CREATE TABLE IF NOT EXISTS public.playlist_folder_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid REFERENCES public.playlist_folders(id) ON DELETE CASCADE NOT NULL,
  playlist_id uuid REFERENCES public.playlists(id) ON DELETE CASCADE NOT NULL,
  position integer DEFAULT 0,
  UNIQUE(folder_id, playlist_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_playlists_user ON public.playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlists_public ON public.playlists(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_playlists_collaborative ON public.playlists(is_collaborative) WHERE is_collaborative = true;
CREATE INDEX IF NOT EXISTS idx_playlists_updated ON public.playlists(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON public.playlist_tracks(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_track ON public.playlist_tracks(track_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_position ON public.playlist_tracks(playlist_id, position);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_added_by ON public.playlist_tracks(added_by);

CREATE INDEX IF NOT EXISTS idx_playlist_collaborators_playlist ON public.playlist_collaborators(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_collaborators_user ON public.playlist_collaborators(user_id);

CREATE INDEX IF NOT EXISTS idx_playlist_folders_user ON public.playlist_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_playlist_folders_parent ON public.playlist_folders(parent_folder_id);

-- RLS Policies
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_folder_items ENABLE ROW LEVEL SECURITY;

-- Playlists: Users can view their own and public playlists
CREATE POLICY "Users can view own playlists" ON public.playlists
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Public playlists viewable" ON public.playlists
FOR SELECT USING (is_public = true);

CREATE POLICY "Collaborators can view playlists" ON public.playlists
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.playlist_collaborators
    WHERE playlist_id = playlists.id AND user_id = auth.uid()
  )
);

-- Playlists: Users can manage own playlists
CREATE POLICY "Users can insert own playlists" ON public.playlists
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own playlists" ON public.playlists
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own playlists" ON public.playlists
FOR DELETE USING (auth.uid() = user_id);

-- Playlist tracks: View based on playlist access
CREATE POLICY "Users can view playlist tracks" ON public.playlist_tracks
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.playlists
    WHERE id = playlist_tracks.playlist_id
    AND (user_id = auth.uid() OR is_public = true OR is_collaborative = true)
  )
);

-- Playlist tracks: Add/remove based on permissions
CREATE POLICY "Owners can manage playlist tracks" ON public.playlist_tracks
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.playlists
    WHERE id = playlist_tracks.playlist_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Collaborators can add tracks" ON public.playlist_tracks
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.playlist_collaborators
    WHERE playlist_id = playlist_tracks.playlist_id 
    AND user_id = auth.uid() 
    AND can_add_tracks = true
  )
);

CREATE POLICY "Collaborators can remove tracks" ON public.playlist_tracks
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.playlist_collaborators
    WHERE playlist_id = playlist_tracks.playlist_id 
    AND user_id = auth.uid() 
    AND can_remove_tracks = true
  )
);

-- Playlist collaborators: View own collaborations
CREATE POLICY "Users can view collaborators" ON public.playlist_collaborators
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.playlists
    WHERE id = playlist_collaborators.playlist_id 
    AND (user_id = auth.uid() OR is_public = true)
  )
);

-- Playlist collaborators: Owners can manage
CREATE POLICY "Owners can manage collaborators" ON public.playlist_collaborators
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.playlists
    WHERE id = playlist_collaborators.playlist_id AND user_id = auth.uid()
  )
);

-- Playlist folders: Users manage their own
CREATE POLICY "Users can manage own folders" ON public.playlist_folders
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage folder items" ON public.playlist_folder_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.playlist_folders
    WHERE id = playlist_folder_items.folder_id AND user_id = auth.uid()
  )
);

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_playlist_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER playlists_updated_at
  BEFORE UPDATE ON public.playlists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_playlist_timestamp();

-- Function to reorder playlist tracks
CREATE OR REPLACE FUNCTION public.reorder_playlist_tracks(
  p_playlist_id uuid,
  p_track_ids uuid[]
)
RETURNS void AS $$
DECLARE
  track_id uuid;
  idx integer := 0;
BEGIN
  -- Check if user has permission
  IF NOT EXISTS (
    SELECT 1 FROM public.playlists
    WHERE id = p_playlist_id AND user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.playlist_collaborators
    WHERE playlist_id = p_playlist_id AND user_id = auth.uid() AND can_edit = true
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Update positions
  FOREACH track_id IN ARRAY p_track_ids
  LOOP
    UPDATE public.playlist_tracks
    SET position = idx
    WHERE playlist_id = p_playlist_id AND track_id = track_id;
    idx := idx + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.reorder_playlist_tracks(uuid, uuid[]) TO authenticated;

-- Function to add tracks to playlist (with auto position)
CREATE OR REPLACE FUNCTION public.add_track_to_playlist(
  p_playlist_id uuid,
  p_track_id uuid
)
RETURNS uuid AS $$
DECLARE
  max_position integer;
  new_id uuid;
BEGIN
  -- Get current max position
  SELECT COALESCE(MAX(position), -1) INTO max_position
  FROM public.playlist_tracks
  WHERE playlist_id = p_playlist_id;

  -- Insert with next position
  INSERT INTO public.playlist_tracks (playlist_id, track_id, added_by, position)
  VALUES (p_playlist_id, p_track_id, auth.uid(), max_position + 1)
  ON CONFLICT (playlist_id, track_id) DO NOTHING
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.add_track_to_playlist(uuid, uuid) TO authenticated;

COMMENT ON TABLE public.playlists IS 'User-created playlists';
COMMENT ON TABLE public.playlist_tracks IS 'Tracks within playlists';
COMMENT ON TABLE public.playlist_collaborators IS 'Collaborative playlist permissions';
COMMENT ON TABLE public.playlist_folders IS 'Playlist organization folders';


-- ============================================================================
-- Migration: 20260122_premium_billing.sql
-- ============================================================================

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


-- ============================================================================
-- Migration: 20260122_profile_themes.sql
-- ============================================================================

-- Profile Theme System
-- Created: 2026-01-22
-- Purpose: Custom profile themes and styling

-- Create user_themes table
CREATE TABLE IF NOT EXISTS public.user_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  theme_name text NOT NULL DEFAULT 'custom',
  colors jsonb NOT NULL DEFAULT '{
    "background": "#000000",
    "surface": "#1a1a1a",
    "primary": "#3b82f6",
    "secondary": "#8b5cf6",
    "accent": "#f59e0b",
    "text": "#ffffff",
    "textMuted": "#9ca3af"
  }'::jsonb,
  fonts jsonb NOT NULL DEFAULT '{
    "heading": "Inter",
    "body": "Inter"
  }'::jsonb,
  layout text NOT NULL DEFAULT 'modern' CHECK (layout IN ('modern', 'minimal', 'retro', 'neon', 'academic')),
  custom_css text,
  banner_url text,
  profile_url_slug text UNIQUE,
  show_visitor_count boolean DEFAULT false,
  animated_background boolean DEFAULT false,
  player_skin text DEFAULT 'default' CHECK (player_skin IN ('default', 'compact', 'glassmorphism', 'retro', 'minimal')),
  is_public boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_themes_user ON public.user_themes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_themes_slug ON public.user_themes(profile_url_slug) WHERE profile_url_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_themes_public ON public.user_themes(is_public) WHERE is_public = true;

-- Create theme presets table
CREATE TABLE IF NOT EXISTS public.theme_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  colors jsonb NOT NULL,
  fonts jsonb NOT NULL,
  layout text NOT NULL,
  custom_css text,
  player_skin text DEFAULT 'default',
  animated_background boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  usage_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_theme_presets_featured ON public.theme_presets(is_featured) WHERE is_featured = true;

-- Insert default theme presets
INSERT INTO public.theme_presets (name, description, colors, fonts, layout, player_skin, animated_background, is_featured) VALUES
  ('Dark Modern', 'Sleek dark theme with blue accents', 
   '{"background": "#0a0a0a", "surface": "#1a1a1a", "primary": "#3b82f6", "secondary": "#8b5cf6", "accent": "#f59e0b", "text": "#ffffff", "textMuted": "#9ca3af"}'::jsonb,
   '{"heading": "Inter", "body": "Inter"}'::jsonb,
   'modern', 'glassmorphism', false, true),
  
  ('Minimal Light', 'Clean and minimal light theme',
   '{"background": "#ffffff", "surface": "#f9fafb", "primary": "#1f2937", "secondary": "#6b7280", "accent": "#3b82f6", "text": "#111827", "textMuted": "#6b7280"}'::jsonb,
   '{"heading": "Inter", "body": "Inter"}'::jsonb,
   'minimal', 'minimal', false, true),
  
  ('Neon Dreams', 'Vibrant neon with animated background',
   '{"background": "#0a0014", "surface": "#1a0028", "primary": "#ff00ff", "secondary": "#00ffff", "accent": "#ffff00", "text": "#ffffff", "textMuted": "#b19cd9"}'::jsonb,
   '{"heading": "Orbitron", "body": "Roboto"}'::jsonb,
   'neon', 'retro', true, true),
  
  ('Retro Wave', 'Synthwave inspired retro theme',
   '{"background": "#1a1a2e", "surface": "#16213e", "primary": "#ff006e", "secondary": "#8338ec", "accent": "#ffbe0b", "text": "#eaeaea", "textMuted": "#a8a8a8"}'::jsonb,
   '{"heading": "Press Start 2P", "body": "Roboto Mono"}'::jsonb,
   'retro', 'retro', false, true),
  
  ('Dark Academia', 'Scholarly dark theme with warm tones',
   '{"background": "#1c1917", "surface": "#292524", "primary": "#d97706", "secondary": "#78716c", "accent": "#b45309", "text": "#fafaf9", "textMuted": "#a8a29e"}'::jsonb,
   '{"heading": "Playfair Display", "body": "Lora"}'::jsonb,
   'academic', 'default', false, true)
ON CONFLICT (name) DO NOTHING;

-- RLS Policies
ALTER TABLE public.user_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_presets ENABLE ROW LEVEL SECURITY;

-- Users can view their own themes
CREATE POLICY "Users can view own themes" ON public.user_themes
FOR SELECT USING (auth.uid() = user_id);

-- Users can view public themes
CREATE POLICY "Public themes are viewable" ON public.user_themes
FOR SELECT USING (is_public = true);

-- Users can manage their own themes
CREATE POLICY "Users can manage own themes" ON public.user_themes
FOR ALL USING (auth.uid() = user_id);

-- Everyone can view theme presets
CREATE POLICY "Anyone can view presets" ON public.theme_presets
FOR SELECT USING (true);

-- Only admins can manage theme presets
CREATE POLICY "Admins can manage presets" ON public.theme_presets
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_user_theme_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_themes_updated_at
  BEFORE UPDATE ON public.user_themes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_theme_timestamp();

-- Function to increment theme preset usage
CREATE OR REPLACE FUNCTION public.increment_theme_usage(preset_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.theme_presets
  SET usage_count = usage_count + 1
  WHERE id = preset_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.increment_theme_usage(uuid) TO authenticated;

COMMENT ON TABLE public.user_themes IS 'Custom profile themes for users';
COMMENT ON TABLE public.theme_presets IS 'Pre-made theme templates users can apply';


-- ============================================================================
-- Migration: 20260122_reddit_forum.sql
-- ============================================================================

-- Reddit-like Discussion Forum
-- Supports subreddit-style communities, posts, comments, voting, awards

-- Forums (Subreddits)
CREATE TABLE IF NOT EXISTS forums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL CHECK (name ~ '^[a-zA-Z0-9_]{3,21}$'),
  display_name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  banner_url TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  is_nsfw BOOLEAN DEFAULT FALSE,
  is_restricted BOOLEAN DEFAULT FALSE,
  member_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_forums_name ON forums(name);
CREATE INDEX idx_forums_category ON forums(category);
CREATE INDEX idx_forums_member_count ON forums(member_count DESC);

-- Forum Members
CREATE TABLE IF NOT EXISTS forum_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forum_id UUID REFERENCES forums(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin', 'banned')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(forum_id, user_id)
);

CREATE INDEX idx_forum_members_user ON forum_members(user_id);
CREATE INDEX idx_forum_members_forum ON forum_members(forum_id);

-- Posts
CREATE TABLE IF NOT EXISTS forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forum_id UUID REFERENCES forums(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(title) >= 3 AND char_length(title) <= 300),
  content TEXT,
  content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'link', 'image', 'video', 'poll')),
  url TEXT,
  image_urls TEXT[],
  track_id TEXT,
  vote_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  is_nsfw BOOLEAN DEFAULT FALSE,
  is_spoiler BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_forum_posts_forum ON forum_posts(forum_id, created_at DESC);
CREATE INDEX idx_forum_posts_user ON forum_posts(user_id);
CREATE INDEX idx_forum_posts_vote_count ON forum_posts(vote_count DESC);
CREATE INDEX idx_forum_posts_track ON forum_posts(track_id) WHERE track_id IS NOT NULL;

-- Comments
CREATE TABLE IF NOT EXISTS forum_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES forum_comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 10000),
  vote_count INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_forum_comments_post ON forum_comments(post_id, created_at ASC);
CREATE INDEX idx_forum_comments_parent ON forum_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;
CREATE INDEX idx_forum_comments_user ON forum_comments(user_id);

-- Votes (Reddit-style upvote/downvote)
CREATE TABLE IF NOT EXISTS forum_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES forum_comments(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id),
  UNIQUE(user_id, comment_id),
  CHECK ((post_id IS NOT NULL AND comment_id IS NULL) OR (post_id IS NULL AND comment_id IS NOT NULL))
);

CREATE INDEX idx_forum_votes_user ON forum_votes(user_id);
CREATE INDEX idx_forum_votes_post ON forum_votes(post_id) WHERE post_id IS NOT NULL;
CREATE INDEX idx_forum_votes_comment ON forum_votes(comment_id) WHERE comment_id IS NOT NULL;

-- Awards (Gold, Silver, etc.)
CREATE TABLE IF NOT EXISTS forum_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  icon TEXT NOT NULL,
  description TEXT,
  cost INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Award Instances (given to posts/comments)
CREATE TABLE IF NOT EXISTS forum_award_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  award_id UUID REFERENCES forum_awards(id) ON DELETE CASCADE,
  post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES forum_comments(id) ON DELETE CASCADE,
  given_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  given_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK ((post_id IS NOT NULL AND comment_id IS NULL) OR (post_id IS NULL AND comment_id IS NOT NULL))
);

CREATE INDEX idx_award_instances_post ON forum_award_instances(post_id) WHERE post_id IS NOT NULL;
CREATE INDEX idx_award_instances_comment ON forum_award_instances(comment_id) WHERE comment_id IS NOT NULL;

-- User Flair
CREATE TABLE IF NOT EXISTS forum_user_flair (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forum_id UUID REFERENCES forums(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  flair_text TEXT CHECK (char_length(flair_text) <= 64),
  flair_color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(forum_id, user_id)
);

-- Saved Posts (bookmarks)
CREATE TABLE IF NOT EXISTS forum_saved_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Triggers for auto-updating counts

-- Update forum member count
CREATE OR REPLACE FUNCTION update_forum_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forums SET member_count = member_count + 1 WHERE id = NEW.forum_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forums SET member_count = GREATEST(0, member_count - 1) WHERE id = OLD.forum_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_forum_member_count
AFTER INSERT OR DELETE ON forum_members
FOR EACH ROW EXECUTE FUNCTION update_forum_member_count();

-- Update forum post count
CREATE OR REPLACE FUNCTION update_forum_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forums SET post_count = post_count + 1 WHERE id = NEW.forum_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forums SET post_count = GREATEST(0, post_count - 1) WHERE id = OLD.forum_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_forum_post_count
AFTER INSERT OR DELETE ON forum_posts
FOR EACH ROW EXECUTE FUNCTION update_forum_post_count();

-- Update post comment count
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_post_comment_count
AFTER INSERT OR DELETE ON forum_comments
FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- Update post vote count
CREATE OR REPLACE FUNCTION update_post_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_posts 
    SET vote_count = vote_count + CASE WHEN NEW.vote_type = 'up' THEN 1 ELSE -1 END 
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE forum_posts 
    SET vote_count = vote_count + CASE 
      WHEN NEW.vote_type = 'up' AND OLD.vote_type = 'down' THEN 2
      WHEN NEW.vote_type = 'down' AND OLD.vote_type = 'up' THEN -2
      ELSE 0 
    END 
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_posts 
    SET vote_count = vote_count - CASE WHEN OLD.vote_type = 'up' THEN 1 ELSE -1 END 
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_post_vote_count
AFTER INSERT OR UPDATE OR DELETE ON forum_votes
FOR EACH ROW 
WHEN (NEW.post_id IS NOT NULL OR OLD.post_id IS NOT NULL)
EXECUTE FUNCTION update_post_vote_count();

-- Update comment vote count
CREATE OR REPLACE FUNCTION update_comment_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_comments 
    SET vote_count = vote_count + CASE WHEN NEW.vote_type = 'up' THEN 1 ELSE -1 END 
    WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE forum_comments 
    SET vote_count = vote_count + CASE 
      WHEN NEW.vote_type = 'up' AND OLD.vote_type = 'down' THEN 2
      WHEN NEW.vote_type = 'down' AND OLD.vote_type = 'up' THEN -2
      ELSE 0 
    END 
    WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_comments 
    SET vote_count = vote_count - CASE WHEN OLD.vote_type = 'up' THEN 1 ELSE -1 END 
    WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_comment_vote_count
AFTER INSERT OR UPDATE OR DELETE ON forum_votes
FOR EACH ROW 
WHEN (NEW.comment_id IS NOT NULL OR OLD.comment_id IS NOT NULL)
EXECUTE FUNCTION update_comment_vote_count();

-- RLS Policies

ALTER TABLE forums ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_award_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_user_flair ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_saved_posts ENABLE ROW LEVEL SECURITY;

-- Forums: Public read, authenticated create
CREATE POLICY "forums_select" ON forums FOR SELECT USING (true);
CREATE POLICY "forums_insert" ON forums FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "forums_update" ON forums FOR UPDATE USING (
  created_by = auth.uid() OR 
  EXISTS (SELECT 1 FROM forum_members WHERE forum_id = id AND user_id = auth.uid() AND role IN ('admin', 'moderator'))
);

-- Forum Members: Public read, users can join/leave
CREATE POLICY "forum_members_select" ON forum_members FOR SELECT USING (true);
CREATE POLICY "forum_members_insert" ON forum_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_members_delete" ON forum_members FOR DELETE USING (auth.uid() = user_id);

-- Posts: Public read, authenticated create, author/mod edit
CREATE POLICY "forum_posts_select" ON forum_posts FOR SELECT USING (true);
CREATE POLICY "forum_posts_insert" ON forum_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_posts_update" ON forum_posts FOR UPDATE USING (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM forum_members WHERE forum_id = forum_posts.forum_id AND user_id = auth.uid() AND role IN ('admin', 'moderator'))
);
CREATE POLICY "forum_posts_delete" ON forum_posts FOR DELETE USING (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM forum_members WHERE forum_id = forum_posts.forum_id AND user_id = auth.uid() AND role IN ('admin', 'moderator'))
);

-- Comments: Public read, authenticated create, author edit
CREATE POLICY "forum_comments_select" ON forum_comments FOR SELECT USING (true);
CREATE POLICY "forum_comments_insert" ON forum_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_comments_update" ON forum_comments FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "forum_comments_delete" ON forum_comments FOR DELETE USING (user_id = auth.uid());

-- Votes: User can manage their own votes
CREATE POLICY "forum_votes_select" ON forum_votes FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "forum_votes_insert" ON forum_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_votes_update" ON forum_votes FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "forum_votes_delete" ON forum_votes FOR DELETE USING (user_id = auth.uid());

-- Awards: Public read
CREATE POLICY "forum_awards_select" ON forum_awards FOR SELECT USING (true);
CREATE POLICY "forum_award_instances_select" ON forum_award_instances FOR SELECT USING (true);
CREATE POLICY "forum_award_instances_insert" ON forum_award_instances FOR INSERT WITH CHECK (auth.uid() = given_by);

-- Flair: Public read, user can set their own
CREATE POLICY "forum_user_flair_select" ON forum_user_flair FOR SELECT USING (true);
CREATE POLICY "forum_user_flair_insert" ON forum_user_flair FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_user_flair_update" ON forum_user_flair FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "forum_user_flair_delete" ON forum_user_flair FOR DELETE USING (user_id = auth.uid());

-- Saved Posts: User can manage their own saves
CREATE POLICY "forum_saved_posts_select" ON forum_saved_posts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "forum_saved_posts_insert" ON forum_saved_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_saved_posts_delete" ON forum_saved_posts FOR DELETE USING (user_id = auth.uid());

-- Seed default forums
INSERT INTO forums (name, display_name, description, category) VALUES
('music', 'Music Hub', 'All things music - discuss tracks, artists, and genres', 'music'),
('hiphop', 'Hip Hop', 'Hip hop music discussion and culture', 'music'),
('rock', 'Rock Music', 'Classic and modern rock', 'music'),
('jazz', 'Jazz', 'Jazz appreciation and discussion', 'music'),
('electronic', 'Electronic', 'EDM, techno, house, and all electronic music', 'music'),
('israel', 'Israel', 'Israeli music and culture (ישראל)', 'regional'),
('worldmusic', 'World Music', 'Music from around the globe', 'regional'),
('recommendations', 'Music Recommendations', 'Get and give music recommendations', 'general'),
('production', 'Music Production', 'Production tips, techniques, and gear', 'creation'),
('theory', 'Music Theory', 'Discuss chords, progressions, and composition', 'education')
ON CONFLICT (name) DO NOTHING;

-- Seed awards
INSERT INTO forum_awards (name, display_name, icon, description, cost) VALUES
('gold', 'Gold', '🥇', 'Premium award showing exceptional content', 500),
('silver', 'Silver', '🥈', 'Great content worth recognizing', 100),
('bronze', 'Bronze', '🥉', 'Good contribution', 50),
('fire', 'Fire', '🔥', 'Hot take or trending content', 200),
('headphones', 'Headphones', '🎧', 'Excellent music recommendation', 150),
('mic', 'Golden Mic', '🎤', 'Outstanding vocal/lyrical analysis', 300),
('heart', 'Heart', '❤️', 'Wholesome or touching post', 100)
ON CONFLICT (name) DO NOTHING;


-- ============================================================================
-- Migration: 20260122_track_comments.sql
-- ============================================================================

-- Track Comments System
-- Public comments on track profiles visible to all users

-- Track comments table
CREATE TABLE IF NOT EXISTS track_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  comment TEXT NOT NULL CHECK (length(comment) >= 1 AND length(comment) <= 2000),
  reply_to UUID REFERENCES track_comments(id) ON DELETE CASCADE,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  edited_at TIMESTAMPTZ
);

-- Comment likes table
CREATE TABLE IF NOT EXISTS track_comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES track_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_track_comments_track_id ON track_comments(track_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_track_comments_user_id ON track_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_track_comments_reply_to ON track_comments(reply_to) WHERE reply_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_track_comment_likes_comment ON track_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_track_comment_likes_user ON track_comment_likes(user_id);

-- Enable Row Level Security
ALTER TABLE track_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_comment_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for track_comments
CREATE POLICY "Anyone can view track comments"
  ON track_comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can post comments"
  ON track_comments FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can edit their own comments"
  ON track_comments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON track_comments FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for track_comment_likes
CREATE POLICY "Anyone can view comment likes"
  ON track_comment_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can like comments"
  ON track_comment_likes FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can remove their likes"
  ON track_comment_likes FOR DELETE
  USING (user_id = auth.uid());

-- Function to update comment likes count
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE track_comments
    SET likes_count = likes_count + 1
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE track_comments
    SET likes_count = likes_count - 1
    WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update likes count automatically
CREATE TRIGGER track_comment_likes_count_trigger
  AFTER INSERT OR DELETE ON track_comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_likes_count();

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_track_comment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_track_comments_updated_at
  BEFORE UPDATE ON track_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_track_comment_updated_at();

-- Function to get comments with user info
CREATE OR REPLACE FUNCTION get_track_comments(p_track_id TEXT, p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0)
RETURNS TABLE (
  id UUID,
  track_id TEXT,
  user_id UUID,
  comment TEXT,
  reply_to UUID,
  likes_count INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,
  user_display_name TEXT,
  user_avatar_url TEXT,
  user_liked BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tc.id,
    tc.track_id,
    tc.user_id,
    tc.comment,
    tc.reply_to,
    tc.likes_count,
    tc.created_at,
    tc.updated_at,
    tc.edited_at,
    p.display_name,
    p.avatar_url,
    EXISTS(
      SELECT 1 FROM track_comment_likes tcl
      WHERE tcl.comment_id = tc.id
      AND tcl.user_id = auth.uid()
    ) as user_liked
  FROM track_comments tc
  LEFT JOIN profiles p ON p.id = tc.user_id
  WHERE tc.track_id = p_track_id
  AND tc.reply_to IS NULL -- Only top-level comments
  ORDER BY tc.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get comment replies
CREATE OR REPLACE FUNCTION get_comment_replies(p_comment_id UUID)
RETURNS TABLE (
  id UUID,
  track_id TEXT,
  user_id UUID,
  comment TEXT,
  reply_to UUID,
  likes_count INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,
  user_display_name TEXT,
  user_avatar_url TEXT,
  user_liked BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tc.id,
    tc.track_id,
    tc.user_id,
    tc.comment,
    tc.reply_to,
    tc.likes_count,
    tc.created_at,
    tc.updated_at,
    tc.edited_at,
    p.display_name,
    p.avatar_url,
    EXISTS(
      SELECT 1 FROM track_comment_likes tcl
      WHERE tcl.comment_id = tc.id
      AND tcl.user_id = auth.uid()
    ) as user_liked
  FROM track_comments tc
  LEFT JOIN profiles p ON p.id = tc.user_id
  WHERE tc.reply_to = p_comment_id
  ORDER BY tc.created_at ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON TABLE track_comments IS 'Public comments on track profiles visible to all users';
COMMENT ON TABLE track_comment_likes IS 'User likes on track comments';
COMMENT ON FUNCTION get_track_comments IS 'Get top-level comments for a track with user info and like status';
COMMENT ON FUNCTION get_comment_replies IS 'Get replies to a specific comment';


-- ============================================================================
-- Migration: 20260122_unified_interactions.sql
-- ============================================================================

-- Unified User Interactions System
-- Links likes, harmonies, saves, playlists, and collections together

-- ============================================================================
-- 1. UNIFIED USER_INTERACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  
  -- Interaction types (can have multiple per track)
  liked BOOLEAN DEFAULT FALSE,
  harmony_saved BOOLEAN DEFAULT FALSE,
  bookmarked BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  liked_at TIMESTAMPTZ,
  harmony_saved_at TIMESTAMPTZ,
  bookmarked_at TIMESTAMPTZ,
  play_count INTEGER DEFAULT 0,
  last_played_at TIMESTAMPTZ,
  
  -- Analytics
  total_listen_time_ms BIGINT DEFAULT 0,
  skip_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, track_id)
);

CREATE INDEX idx_user_interactions_user ON user_interactions(user_id);
CREATE INDEX idx_user_interactions_track ON user_interactions(track_id);
CREATE INDEX idx_user_interactions_liked ON user_interactions(user_id) WHERE liked = TRUE;
CREATE INDEX idx_user_interactions_harmony ON user_interactions(user_id) WHERE harmony_saved = TRUE;
CREATE INDEX idx_user_interactions_bookmarked ON user_interactions(user_id) WHERE bookmarked = TRUE;

-- ============================================================================
-- 2. PLAYLISTS SYSTEM (DRY with user_interactions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  description TEXT,
  cover_image_url TEXT,
  
  -- Playlist type
  type TEXT DEFAULT 'custom' CHECK (type IN ('custom', 'smart', 'liked', 'harmony', 'bookmarked')),
  
  -- Smart playlist criteria (JSONB for flexibility)
  smart_criteria JSONB,
  
  -- Visibility
  is_public BOOLEAN DEFAULT TRUE,
  is_collaborative BOOLEAN DEFAULT FALSE,
  
  -- Stats
  track_count INTEGER DEFAULT 0,
  total_duration_ms BIGINT DEFAULT 0,
  follower_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_playlists_user ON playlists(user_id);
CREATE INDEX idx_playlists_type ON playlists(type);
CREATE INDEX idx_playlists_public ON playlists(is_public) WHERE is_public = TRUE;

-- Playlist tracks (many-to-many with ordering)
CREATE TABLE IF NOT EXISTS playlist_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(playlist_id, track_id),
  UNIQUE(playlist_id, position)
);

CREATE INDEX idx_playlist_tracks_playlist ON playlist_tracks(playlist_id, position);
CREATE INDEX idx_playlist_tracks_track ON playlist_tracks(track_id);

-- Playlist followers
CREATE TABLE IF NOT EXISTS playlist_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followed_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(playlist_id, user_id)
);

CREATE INDEX idx_playlist_followers_user ON playlist_followers(user_id);
CREATE INDEX idx_playlist_followers_playlist ON playlist_followers(playlist_id);

-- ============================================================================
-- 3. AUTO-GENERATED PLAYLISTS (Liked Songs, Harmonies, Bookmarks)
-- ============================================================================

-- Create auto-playlists for existing users
CREATE OR REPLACE FUNCTION create_auto_playlists()
RETURNS TRIGGER AS $$
BEGIN
  -- Liked Songs playlist
  INSERT INTO playlists (user_id, name, description, type, is_public)
  VALUES (
    NEW.id,
    'Liked Songs',
    'All your liked tracks in one place',
    'liked',
    FALSE
  );
  
  -- Harmony Saves playlist
  INSERT INTO playlists (user_id, name, description, type, is_public)
  VALUES (
    NEW.id,
    'Harmony Collection',
    'Tracks with saved chord progressions',
    'harmony',
    FALSE
  );
  
  -- Bookmarks playlist
  INSERT INTO playlists (user_id, name, description, type, is_public)
  VALUES (
    NEW.id,
    'Bookmarked',
    'Saved for later',
    'bookmarked',
    FALSE
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_auto_playlists
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION create_auto_playlists();

-- ============================================================================
-- 4. SYNC USER_INTERACTIONS TO PLAYLISTS
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_interaction_to_playlist()
RETURNS TRIGGER AS $$
DECLARE
  v_playlist_id UUID;
  v_max_position INTEGER;
BEGIN
  -- Handle LIKED tracks
  IF NEW.liked = TRUE AND (OLD.liked IS NULL OR OLD.liked = FALSE) THEN
    SELECT id INTO v_playlist_id 
    FROM playlists 
    WHERE user_id = NEW.user_id AND type = 'liked' 
    LIMIT 1;
    
    IF v_playlist_id IS NOT NULL THEN
      SELECT COALESCE(MAX(position), 0) INTO v_max_position 
      FROM playlist_tracks 
      WHERE playlist_id = v_playlist_id;
      
      INSERT INTO playlist_tracks (playlist_id, track_id, position, added_by)
      VALUES (v_playlist_id, NEW.track_id, v_max_position + 1, NEW.user_id)
      ON CONFLICT (playlist_id, track_id) DO NOTHING;
    END IF;
  ELSIF NEW.liked = FALSE AND OLD.liked = TRUE THEN
    SELECT id INTO v_playlist_id 
    FROM playlists 
    WHERE user_id = NEW.user_id AND type = 'liked';
    
    DELETE FROM playlist_tracks 
    WHERE playlist_id = v_playlist_id AND track_id = NEW.track_id;
  END IF;
  
  -- Handle HARMONY_SAVED tracks
  IF NEW.harmony_saved = TRUE AND (OLD.harmony_saved IS NULL OR OLD.harmony_saved = FALSE) THEN
    SELECT id INTO v_playlist_id 
    FROM playlists 
    WHERE user_id = NEW.user_id AND type = 'harmony';
    
    IF v_playlist_id IS NOT NULL THEN
      SELECT COALESCE(MAX(position), 0) INTO v_max_position 
      FROM playlist_tracks 
      WHERE playlist_id = v_playlist_id;
      
      INSERT INTO playlist_tracks (playlist_id, track_id, position, added_by)
      VALUES (v_playlist_id, NEW.track_id, v_max_position + 1, NEW.user_id)
      ON CONFLICT (playlist_id, track_id) DO NOTHING;
    END IF;
  ELSIF NEW.harmony_saved = FALSE AND OLD.harmony_saved = TRUE THEN
    SELECT id INTO v_playlist_id 
    FROM playlists 
    WHERE user_id = NEW.user_id AND type = 'harmony';
    
    DELETE FROM playlist_tracks 
    WHERE playlist_id = v_playlist_id AND track_id = NEW.track_id;
  END IF;
  
  -- Handle BOOKMARKED tracks
  IF NEW.bookmarked = TRUE AND (OLD.bookmarked IS NULL OR OLD.bookmarked = FALSE) THEN
    SELECT id INTO v_playlist_id 
    FROM playlists 
    WHERE user_id = NEW.user_id AND type = 'bookmarked';
    
    IF v_playlist_id IS NOT NULL THEN
      SELECT COALESCE(MAX(position), 0) INTO v_max_position 
      FROM playlist_tracks 
      WHERE playlist_id = v_playlist_id;
      
      INSERT INTO playlist_tracks (playlist_id, track_id, position, added_by)
      VALUES (v_playlist_id, NEW.track_id, v_max_position + 1, NEW.user_id)
      ON CONFLICT (playlist_id, track_id) DO NOTHING;
    END IF;
  ELSIF NEW.bookmarked = FALSE AND OLD.bookmarked = TRUE THEN
    SELECT id INTO v_playlist_id 
    FROM playlists 
    WHERE user_id = NEW.user_id AND type = 'bookmarked';
    
    DELETE FROM playlist_tracks 
    WHERE playlist_id = v_playlist_id AND track_id = NEW.track_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_interactions
AFTER INSERT OR UPDATE ON user_interactions
FOR EACH ROW EXECUTE FUNCTION sync_interaction_to_playlist();

-- ============================================================================
-- 5. DRY HELPER FUNCTIONS
-- ============================================================================

-- Toggle like (reusable)
CREATE OR REPLACE FUNCTION toggle_like(
  p_user_id UUID,
  p_track_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_liked BOOLEAN;
BEGIN
  INSERT INTO user_interactions (user_id, track_id, liked, liked_at)
  VALUES (p_user_id, p_track_id, TRUE, NOW())
  ON CONFLICT (user_id, track_id)
  DO UPDATE SET 
    liked = NOT user_interactions.liked,
    liked_at = CASE 
      WHEN NOT user_interactions.liked THEN NOW() 
      ELSE NULL 
    END;
  
  SELECT liked INTO v_is_liked 
  FROM user_interactions 
  WHERE user_id = p_user_id AND track_id = p_track_id;
  
  RETURN v_is_liked;
END;
$$ LANGUAGE plpgsql;

-- Toggle harmony save (reusable)
CREATE OR REPLACE FUNCTION toggle_harmony_save(
  p_user_id UUID,
  p_track_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_saved BOOLEAN;
BEGIN
  INSERT INTO user_interactions (user_id, track_id, harmony_saved, harmony_saved_at)
  VALUES (p_user_id, p_track_id, TRUE, NOW())
  ON CONFLICT (user_id, track_id)
  DO UPDATE SET 
    harmony_saved = NOT user_interactions.harmony_saved,
    harmony_saved_at = CASE 
      WHEN NOT user_interactions.harmony_saved THEN NOW() 
      ELSE NULL 
    END;
  
  SELECT harmony_saved INTO v_is_saved 
  FROM user_interactions 
  WHERE user_id = p_user_id AND track_id = p_track_id;
  
  RETURN v_is_saved;
END;
$$ LANGUAGE plpgsql;

-- Toggle bookmark (reusable)
CREATE OR REPLACE FUNCTION toggle_bookmark(
  p_user_id UUID,
  p_track_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_bookmarked BOOLEAN;
BEGIN
  INSERT INTO user_interactions (user_id, track_id, bookmarked, bookmarked_at)
  VALUES (p_user_id, p_track_id, TRUE, NOW())
  ON CONFLICT (user_id, track_id)
  DO UPDATE SET 
    bookmarked = NOT user_interactions.bookmarked,
    bookmarked_at = CASE 
      WHEN NOT user_interactions.bookmarked THEN NOW() 
      ELSE NULL 
    END;
  
  SELECT bookmarked INTO v_is_bookmarked 
  FROM user_interactions 
  WHERE user_id = p_user_id AND track_id = p_track_id;
  
  RETURN v_is_bookmarked;
END;
$$ LANGUAGE plpgsql;

-- Record play event (reusable, updates analytics)
CREATE OR REPLACE FUNCTION record_play(
  p_user_id UUID,
  p_track_id TEXT,
  p_duration_ms BIGINT DEFAULT 0,
  p_skipped BOOLEAN DEFAULT FALSE
)
RETURNS void AS $$
BEGIN
  INSERT INTO user_interactions (
    user_id, 
    track_id, 
    play_count, 
    last_played_at,
    total_listen_time_ms,
    skip_count
  )
  VALUES (
    p_user_id, 
    p_track_id, 
    1, 
    NOW(),
    p_duration_ms,
    CASE WHEN p_skipped THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id, track_id)
  DO UPDATE SET 
    play_count = user_interactions.play_count + 1,
    last_played_at = NOW(),
    total_listen_time_ms = user_interactions.total_listen_time_ms + p_duration_ms,
    skip_count = user_interactions.skip_count + CASE WHEN p_skipped THEN 1 ELSE 0 END;
END;
$$ LANGUAGE plpgsql;

-- Get user's interaction state for track (reusable)
CREATE OR REPLACE FUNCTION get_interaction_state(
  p_user_id UUID,
  p_track_id TEXT
)
RETURNS TABLE (
  liked BOOLEAN,
  harmony_saved BOOLEAN,
  bookmarked BOOLEAN,
  play_count INTEGER,
  last_played_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ui.liked, FALSE),
    COALESCE(ui.harmony_saved, FALSE),
    COALESCE(ui.bookmarked, FALSE),
    COALESCE(ui.play_count, 0),
    ui.last_played_at
  FROM user_interactions ui
  WHERE ui.user_id = p_user_id AND ui.track_id = p_track_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, FALSE, FALSE, 0, NULL::TIMESTAMPTZ;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get all user's liked tracks (reusable for feed)
CREATE OR REPLACE FUNCTION get_liked_tracks(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  track_id TEXT,
  liked_at TIMESTAMPTZ,
  play_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ui.track_id,
    ui.liked_at,
    ui.play_count
  FROM user_interactions ui
  WHERE ui.user_id = p_user_id AND ui.liked = TRUE
  ORDER BY ui.liked_at DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 6. RLS POLICIES
-- ============================================================================

ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_followers ENABLE ROW LEVEL SECURITY;

-- User interactions: users can only see/edit their own
CREATE POLICY "user_interactions_select" ON user_interactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_interactions_insert" ON user_interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_interactions_update" ON user_interactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_interactions_delete" ON user_interactions
  FOR DELETE USING (auth.uid() = user_id);

-- Playlists: public playlists visible to all, private only to owner
CREATE POLICY "playlists_select" ON playlists
  FOR SELECT USING (is_public = TRUE OR auth.uid() = user_id);

CREATE POLICY "playlists_insert" ON playlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "playlists_update" ON playlists
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    (is_collaborative = TRUE AND EXISTS (
      SELECT 1 FROM playlist_followers 
      WHERE playlist_id = playlists.id AND user_id = auth.uid()
    ))
  );

CREATE POLICY "playlists_delete" ON playlists
  FOR DELETE USING (auth.uid() = user_id);

-- Playlist tracks: visible if playlist is visible
CREATE POLICY "playlist_tracks_select" ON playlist_tracks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM playlists 
      WHERE id = playlist_tracks.playlist_id 
        AND (is_public = TRUE OR user_id = auth.uid())
    )
  );

CREATE POLICY "playlist_tracks_insert" ON playlist_tracks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM playlists 
      WHERE id = playlist_tracks.playlist_id 
        AND (user_id = auth.uid() OR (
          is_collaborative = TRUE AND EXISTS (
            SELECT 1 FROM playlist_followers 
            WHERE playlist_id = playlists.id AND user_id = auth.uid()
          )
        ))
    )
  );

CREATE POLICY "playlist_tracks_delete" ON playlist_tracks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM playlists 
      WHERE id = playlist_tracks.playlist_id 
        AND (user_id = auth.uid() OR (
          is_collaborative = TRUE AND EXISTS (
            SELECT 1 FROM playlist_followers 
            WHERE playlist_id = playlists.id AND user_id = auth.uid()
          )
        ))
    )
  );

-- Playlist followers: users can manage their own follows
CREATE POLICY "playlist_followers_select" ON playlist_followers
  FOR SELECT USING (true);

CREATE POLICY "playlist_followers_insert" ON playlist_followers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "playlist_followers_delete" ON playlist_followers
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 7. UPDATE EXISTING TABLES TO USE NEW SYSTEM
-- ============================================================================

-- Migrate existing track_comment_likes to user_interactions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'track_comment_likes') THEN
    -- This would need custom logic based on your existing schema
    RAISE NOTICE 'Migration of existing data should be done carefully in production';
  END IF;
END $$;

COMMENT ON TABLE user_interactions IS 
'Unified user interactions: likes, harmonies, bookmarks, plays. Single source of truth.';

COMMENT ON FUNCTION toggle_like IS 
'DRY function to toggle like state. Returns new state.';

COMMENT ON FUNCTION sync_interaction_to_playlist IS 
'Auto-sync interactions to corresponding playlists (Liked Songs, Harmonies, Bookmarks).';


-- ============================================================================
-- Migration: 20260124_billing_core.sql
-- ============================================================================

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


-- ============================================================================
-- Migration: 202601240001_test_runs.sql
-- ============================================================================

-- Create test_runs table for logging CI and automated test suite results
create table if not exists public.test_runs (
  id uuid primary key default gen_random_uuid(),
  suite text not null check (suite in ('sanity','pentest','performance')),
  status text not null check (status in ('passed','failed','running','cancelled')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms integer,
  commit_sha text,
  branch text,
  run_id text,
  artifacts_url text,
  summary_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists test_runs_suite_started_idx on public.test_runs (suite, started_at desc);
create index if not exists test_runs_status_started_idx on public.test_runs (status, started_at desc);
create index if not exists test_runs_run_id_suite_idx on public.test_runs (run_id, suite);

-- Trigger to maintain updated_at
create or replace function public.set_test_runs_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_test_runs_updated_at
before update on public.test_runs
for each row execute procedure public.set_test_runs_updated_at();

-- Ensure admin role for seeded admin user
insert into public.user_roles (user_id, role)
select u.id, 'admin'::public.app_role
from auth.users u
where u.email = 'repoisrael@gmail.com'
  and not exists (
    select 1 from public.user_roles ur where ur.user_id = u.id and ur.role = 'admin'
  );

-- RPC to return latest test run per suite
create or replace function public.latest_test_runs()
returns table (
  suite text,
  status text,
  started_at timestamptz,
  finished_at timestamptz,
  duration_ms integer,
  commit_sha text,
  branch text,
  run_id text,
  artifacts_url text,
  summary_json jsonb
) language sql stable as $$
  select distinct on (suite)
    suite,
    status,
    started_at,
    finished_at,
    duration_ms,
    commit_sha,
    branch,
    run_id,
    artifacts_url,
    summary_json
  from public.test_runs
  order by suite, started_at desc;
$$;


-- ============================================================================
-- Migration: 20260125_harmonic_analysis_core.sql
-- ============================================================================

-- Harmonic analysis core tables and indexes
-- Created 2026-01-25

-- Extension for uuid generation if not already present
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- Table: harmonic_fingerprints
create table if not exists public.harmonic_fingerprints (
  id uuid primary key default gen_random_uuid(),
  track_id text not null,
  isrc text,
  audio_hash text,
  tonal_center jsonb not null,
  roman_progression jsonb not null default '[]'::jsonb,
  loop_length_bars integer not null default 4 check (loop_length_bars > 0),
  cadence_type text not null,
  modal_color text,
  borrowed_chords jsonb,
  section_progressions jsonb,
  confidence_score numeric not null check (confidence_score >= 0 and confidence_score <= 1),
  analysis_timestamp timestamptz not null default now(),
  analysis_version text not null,
  is_provisional boolean not null default true,
  detected_key text,
  detected_mode text,
  reuse_until timestamptz generated always as (analysis_timestamp + interval '90 days') stored,
  reanalyze_after timestamptz generated always as (analysis_timestamp + interval '365 days') stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Uniqueness and idempotency
create unique index if not exists idx_hf_track_id on public.harmonic_fingerprints(track_id);
create unique index if not exists idx_hf_audio_hash on public.harmonic_fingerprints(audio_hash) where audio_hash is not null;
create unique index if not exists idx_hf_isrc on public.harmonic_fingerprints(isrc) where isrc is not null;

-- Lookup and filtering indexes
create index if not exists idx_hf_roman_progression on public.harmonic_fingerprints using gin (roman_progression jsonb_path_ops);
create index if not exists idx_hf_cadence_type on public.harmonic_fingerprints(cadence_type);
create index if not exists idx_hf_loop_length_bars on public.harmonic_fingerprints(loop_length_bars);
create index if not exists idx_hf_confidence_score on public.harmonic_fingerprints(confidence_score);
create index if not exists idx_hf_reuse_until on public.harmonic_fingerprints(reuse_until);
create index if not exists idx_hf_reanalyze_after on public.harmonic_fingerprints(reanalyze_after);

-- Table: analysis_jobs
create table if not exists public.analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  track_id text not null,
  isrc text,
  audio_hash text,
  status text not null check (status in ('queued','processing','completed','failed','cached')),
  progress numeric not null default 0 check (progress >= 0 and progress <= 1),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text,
  analysis_version text not null,
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists idx_aj_track_status on public.analysis_jobs(track_id, status);
create index if not exists idx_aj_started_at on public.analysis_jobs(started_at desc);
create index if not exists idx_aj_audio_hash on public.analysis_jobs(audio_hash) where audio_hash is not null;
create index if not exists idx_aj_isrc on public.analysis_jobs(isrc) where isrc is not null;

-- Disable RLS for now (can be enabled with policies later)
alter table public.harmonic_fingerprints disable row level security;
alter table public.analysis_jobs disable row level security;

-- Update timestamp trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_hf_updated_at on public.harmonic_fingerprints;
create trigger trg_hf_updated_at
before update on public.harmonic_fingerprints
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_aj_updated_at on public.analysis_jobs;
create trigger trg_aj_updated_at
before update on public.analysis_jobs
for each row execute procedure public.set_updated_at();


-- ============================================================================
-- Migration: 20260204000000_credits_ledger_growth_loops.sql
-- ============================================================================

-- Credits-based Monetization System (Ledger + Growth Loops)
-- Created 2026-02-04
--
-- Goals:
-- - Server-authoritative credits: grant / spend via SECURITY DEFINER RPCs
-- - Auditability: lot-based ledger + consumption mapping
-- - Growth loops: referrals + daily streak rewards
-- - Safety: rate-limiting primitives for credit-consuming endpoints
-- - Backwards compatible: keep `public.credits.balance` as the primary read model

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1) Credits read model (backwards compatible)
-- ============================================================================

alter table public.credits
  add column if not exists paid_balance integer not null default 0,
  add column if not exists bonus_balance integer not null default 0,
  add column if not exists allowance_balance integer not null default 0,
  add column if not exists expiring_soon_balance integer not null default 0,
  add column if not exists next_expiration_at timestamptz;

comment on column public.credits.balance is 'Available credits (sum of unexpired remaining lots)';
comment on column public.credits.paid_balance is 'Paid credits remaining (non-expiring by default)';
comment on column public.credits.bonus_balance is 'Bonus/earned credits remaining (typically expiring)';
comment on column public.credits.allowance_balance is 'Subscription/free allowance credits remaining (typically expiring)';
comment on column public.credits.expiring_soon_balance is 'Credits expiring within the next 7 days';
comment on column public.credits.next_expiration_at is 'Next soonest lot expiration timestamp (if any)';

-- ============================================================================
-- 2) Credits ledger (lots + spends)
-- ============================================================================

do $$ begin
  create type public.credit_bucket as enum ('paid', 'bonus', 'allowance');
exception when duplicate_object then null;
end $$;

create table if not exists public.credit_lots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  bucket public.credit_bucket not null,
  source text not null,
  amount integer not null check (amount > 0),
  remaining integer not null check (remaining >= 0),
  expires_at timestamptz,
  idempotency_key text,
  provider text,
  provider_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_credit_lots_user on public.credit_lots(user_id);
create index if not exists idx_credit_lots_user_expires on public.credit_lots(user_id, expires_at);
create index if not exists idx_credit_lots_user_bucket on public.credit_lots(user_id, bucket);

create unique index if not exists uniq_credit_lots_user_idempotency
  on public.credit_lots(user_id, idempotency_key)
  where idempotency_key is not null;

create table if not exists public.credit_spends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount > 0),
  feature text not null,
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_credit_spends_user on public.credit_spends(user_id);
create index if not exists idx_credit_spends_feature on public.credit_spends(feature);
create index if not exists idx_credit_spends_created on public.credit_spends(created_at desc);
create unique index if not exists uniq_credit_spends_user_idempotency
  on public.credit_spends(user_id, idempotency_key);

create table if not exists public.credit_spend_consumptions (
  id uuid primary key default gen_random_uuid(),
  spend_id uuid not null references public.credit_spends(id) on delete cascade,
  lot_id uuid not null references public.credit_lots(id) on delete cascade,
  amount integer not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (spend_id, lot_id)
);

create index if not exists idx_credit_consumptions_spend on public.credit_spend_consumptions(spend_id);
create index if not exists idx_credit_consumptions_lot on public.credit_spend_consumptions(lot_id);

-- RLS (users can read their own ledger; writes are service-role/RPC only)
alter table public.credit_lots enable row level security;
alter table public.credit_spends enable row level security;
alter table public.credit_spend_consumptions enable row level security;

create policy "Users can view own credit lots"
  on public.credit_lots for select
  using (auth.uid() = user_id);

create policy "Users can view own credit spends"
  on public.credit_spends for select
  using (auth.uid() = user_id);

create policy "Users can view own credit consumptions"
  on public.credit_spend_consumptions for select
  using (exists (
    select 1 from public.credit_spends s
    where s.id = credit_spend_consumptions.spend_id
      and s.user_id = auth.uid()
  ));

-- ============================================================================
-- 3) Credits core RPCs
-- ============================================================================

create or replace function public.refresh_credits_balance(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
begin
  insert into public.credits (
    user_id,
    balance,
    paid_balance,
    bonus_balance,
    allowance_balance,
    expiring_soon_balance,
    next_expiration_at,
    updated_at
  )
  select
    p_user_id,
    coalesce(sum(remaining) filter (where expires_at is null or expires_at > v_now), 0)::integer as balance,
    coalesce(sum(remaining) filter (where bucket = 'paid' and (expires_at is null or expires_at > v_now)), 0)::integer as paid_balance,
    coalesce(sum(remaining) filter (where bucket = 'bonus' and (expires_at is null or expires_at > v_now)), 0)::integer as bonus_balance,
    coalesce(sum(remaining) filter (where bucket = 'allowance' and (expires_at is null or expires_at > v_now)), 0)::integer as allowance_balance,
    coalesce(sum(remaining) filter (
      where expires_at is not null
        and expires_at > v_now
        and expires_at <= v_now + interval '7 days'
    ), 0)::integer as expiring_soon_balance,
    min(expires_at) filter (where remaining > 0 and expires_at is not null and expires_at > v_now) as next_expiration_at,
    now()
  from public.credit_lots
  where user_id = p_user_id
  on conflict (user_id) do update set
    balance = excluded.balance,
    paid_balance = excluded.paid_balance,
    bonus_balance = excluded.bonus_balance,
    allowance_balance = excluded.allowance_balance,
    expiring_soon_balance = excluded.expiring_soon_balance,
    next_expiration_at = excluded.next_expiration_at,
    updated_at = now();
end;
$$;

comment on function public.refresh_credits_balance is 'Recomputes credit balances for a user from unexpired remaining lots';

create or replace function public.grant_credits(
  p_user_id uuid,
  p_amount integer,
  p_bucket public.credit_bucket,
  p_source text,
  p_expires_at timestamptz default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_provider text default null,
  p_provider_reference text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lot_id uuid;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_credit_amount';
  end if;

  if p_idempotency_key is not null then
    select id into v_lot_id
    from public.credit_lots
    where user_id = p_user_id and idempotency_key = p_idempotency_key
    limit 1;

    if found then
      return v_lot_id;
    end if;
  end if;

  insert into public.credit_lots (
    user_id,
    bucket,
    source,
    amount,
    remaining,
    expires_at,
    idempotency_key,
    provider,
    provider_reference,
    metadata
  )
  values (
    p_user_id,
    p_bucket,
    p_source,
    p_amount,
    p_amount,
    p_expires_at,
    p_idempotency_key,
    p_provider,
    p_provider_reference,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_lot_id;

  perform public.refresh_credits_balance(p_user_id);

  return v_lot_id;
end;
$$;

comment on function public.grant_credits is 'Creates a new credit lot (idempotent per user+idempotency_key) and refreshes summary balances';

create or replace function public.spend_credits(
  p_user_id uuid,
  p_amount integer,
  p_idempotency_key text,
  p_feature text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_spend_id uuid;
  v_needed integer := p_amount;
  v_available integer;
  v_take integer;
  v_lot record;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_credit_amount';
  end if;
  if p_idempotency_key is null or length(p_idempotency_key) < 6 then
    raise exception 'invalid_idempotency_key';
  end if;

  select id into v_spend_id
  from public.credit_spends
  where user_id = p_user_id and idempotency_key = p_idempotency_key
  limit 1;

  if found then
    return v_spend_id;
  end if;

  select coalesce(sum(remaining), 0)::integer into v_available
  from public.credit_lots
  where user_id = p_user_id
    and remaining > 0
    and (expires_at is null or expires_at > v_now);

  if v_available < p_amount then
    raise exception 'insufficient_credits' using errcode = 'P0001';
  end if;

  insert into public.credit_spends (user_id, amount, feature, idempotency_key, metadata)
  values (p_user_id, p_amount, p_feature, p_idempotency_key, coalesce(p_metadata, '{}'::jsonb))
  returning id into v_spend_id;

  -- Consume expiring credits first, then oldest grants.
  for v_lot in
    select id, remaining
    from public.credit_lots
    where user_id = p_user_id
      and remaining > 0
      and (expires_at is null or expires_at > v_now)
    order by
      (expires_at is null) asc,
      expires_at asc nulls last,
      created_at asc
    for update
  loop
    exit when v_needed <= 0;
    v_take := least(v_lot.remaining::integer, v_needed);

    update public.credit_lots
      set remaining = remaining - v_take
      where id = v_lot.id;

    insert into public.credit_spend_consumptions (spend_id, lot_id, amount)
      values (v_spend_id, v_lot.id, v_take);

    v_needed := v_needed - v_take;
  end loop;

  perform public.refresh_credits_balance(p_user_id);

  return v_spend_id;
end;
$$;

comment on function public.spend_credits is 'Atomically spends credits using lot FIFO with idempotency and updates summary balances';

-- ============================================================================
-- 4) Referrals (invite loop)
-- ============================================================================

create table if not exists public.referral_codes (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.referral_redemptions (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references public.profiles(id) on delete cascade,
  referee_user_id uuid not null references public.profiles(id) on delete cascade,
  code text not null references public.referral_codes(code) on delete restrict,
  created_at timestamptz not null default now(),
  conversion_rewarded_at timestamptz
);

create unique index if not exists uniq_referral_referee on public.referral_redemptions(referee_user_id);
create index if not exists idx_referral_referrer on public.referral_redemptions(referrer_user_id);

alter table public.referral_codes enable row level security;
alter table public.referral_redemptions enable row level security;

create policy "Users can view own referral code"
  on public.referral_codes for select
  using (auth.uid() = user_id);

create policy "Users can view own referral redemptions"
  on public.referral_redemptions for select
  using (auth.uid() = referrer_user_id or auth.uid() = referee_user_id);

create or replace function public.generate_referral_code()
returns text
language sql
security definer
set search_path = public
as $$
  select upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10));
$$;

create or replace function public.get_or_create_referral_code(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  select code into v_code from public.referral_codes where user_id = p_user_id;
  if found then return v_code; end if;

  loop
    v_code := public.generate_referral_code();
    begin
      insert into public.referral_codes (user_id, code) values (p_user_id, v_code);
      exit;
    exception when unique_violation then
      -- retry on collision
    end;
  end loop;

  return v_code;
end;
$$;

comment on function public.get_or_create_referral_code is 'Creates a unique referral code for a user if missing';

create or replace function public.redeem_referral(p_referee_user_id uuid, p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer_user_id uuid;
begin
  if p_code is null or length(trim(p_code)) < 4 then
    raise exception 'invalid_referral_code';
  end if;

  select user_id into v_referrer_user_id
  from public.referral_codes
  where code = p_code
  limit 1;

  if v_referrer_user_id is null then
    raise exception 'invalid_referral_code';
  end if;

  if v_referrer_user_id = p_referee_user_id then
    raise exception 'self_referral_not_allowed';
  end if;

  -- One referral per referee.
  insert into public.referral_redemptions (referrer_user_id, referee_user_id, code)
  values (v_referrer_user_id, p_referee_user_id, p_code)
  on conflict (referee_user_id) do nothing;

  -- Signup bonus (expiring bonus credits for urgency).
  perform public.grant_credits(
    p_referee_user_id,
    75,
    'bonus',
    'referral_signup',
    now() + interval '30 days',
    'referral:signup:' || p_referee_user_id::text,
    jsonb_build_object('referrer_user_id', v_referrer_user_id::text),
    null,
    null
  );

  perform public.grant_credits(
    v_referrer_user_id,
    75,
    'bonus',
    'referral_signup',
    now() + interval '30 days',
    'referral:signup:' || p_referee_user_id::text,
    jsonb_build_object('referee_user_id', p_referee_user_id::text),
    null,
    null
  );
end;
$$;

comment on function public.redeem_referral is 'Awards referral signup bonuses to both referrer and referee (idempotent per referee)';

create or replace function public.award_referral_conversion(p_referee_user_id uuid, p_provider_reference text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_redemption record;
begin
  select *
    into v_redemption
  from public.referral_redemptions
  where referee_user_id = p_referee_user_id
  limit 1;

  if not found then
    return;
  end if;

  if v_redemption.conversion_rewarded_at is not null then
    return;
  end if;

  -- Conversion reward goes to referrer (higher intent).
  perform public.grant_credits(
    v_redemption.referrer_user_id,
    150,
    'bonus',
    'referral_conversion',
    now() + interval '60 days',
    'referral:conversion:' || p_referee_user_id::text,
    jsonb_build_object('referee_user_id', p_referee_user_id::text, 'provider_reference', p_provider_reference),
    'stripe',
    p_provider_reference
  );

  update public.referral_redemptions
    set conversion_rewarded_at = now()
    where id = v_redemption.id;
end;
$$;

comment on function public.award_referral_conversion is 'One-time conversion reward to the referrer when referee makes a purchase';

-- ============================================================================
-- 5) Daily check-in + streak rewards (return loop)
-- ============================================================================

create table if not exists public.user_streaks (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_claim_date date,
  updated_at timestamptz not null default now()
);

alter table public.user_streaks enable row level security;

create policy "Users can view own streak"
  on public.user_streaks for select
  using (auth.uid() = user_id);

create or replace function public.claim_daily_credits(p_user_id uuid)
returns table(granted integer, streak integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := current_date;
  v_last date;
  v_streak integer;
  v_longest integer;
  v_base integer := 5;
  v_bonus integer := 0;
  v_total integer;
begin
  -- Lock streak row for update.
  insert into public.user_streaks (user_id, current_streak, longest_streak, last_claim_date)
  values (p_user_id, 0, 0, null)
  on conflict (user_id) do nothing;

  select last_claim_date, current_streak, longest_streak
    into v_last, v_streak, v_longest
  from public.user_streaks
  where user_id = p_user_id
  for update;

  if v_last = v_today then
    return query select 0::integer, v_streak::integer;
    return;
  end if;

  if v_last = (v_today - 1) then
    v_streak := v_streak + 1;
  else
    v_streak := 1;
  end if;

  -- Milestone bonuses.
  if v_streak in (7, 14, 21, 30) then
    v_bonus := 20;
  end if;

  v_total := v_base + v_bonus;

  -- Daily credits expire quickly to encourage return.
  perform public.grant_credits(
    p_user_id,
    v_total,
    'bonus',
    'daily_checkin',
    now() + interval '7 days',
    'daily:' || v_today::text,
    jsonb_build_object('base', v_base, 'bonus', v_bonus, 'streak', v_streak),
    null,
    null
  );

  v_longest := greatest(v_longest, v_streak);

  update public.user_streaks
    set current_streak = v_streak,
        longest_streak = v_longest,
        last_claim_date = v_today,
        updated_at = now()
    where user_id = p_user_id;

  return query select v_total::integer, v_streak::integer;
end;
$$;

comment on function public.claim_daily_credits is 'Grants daily bonus credits (capped) with streak milestones; returns (granted, streak)';

-- ============================================================================
-- 6) Rate limiting primitives (server-authoritative)
-- ============================================================================

create table if not exists public.rate_limit_counters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  key text not null,
  bucket_start timestamptz not null,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, key, bucket_start)
);

alter table public.rate_limit_counters enable row level security;

-- No user access; Edge Functions + SECURITY DEFINER RPC only.
create policy "No direct access to rate limits"
  on public.rate_limit_counters for select
  using (false);

create or replace function public.check_rate_limit(
  p_user_id uuid,
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bucket_start timestamptz;
  v_count integer;
begin
  if p_limit is null or p_limit <= 0 then
    raise exception 'invalid_rate_limit';
  end if;
  if p_window_seconds is null or p_window_seconds < 1 then
    raise exception 'invalid_rate_limit_window';
  end if;

  v_bucket_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.rate_limit_counters (user_id, key, bucket_start, count, updated_at)
  values (p_user_id, p_key, v_bucket_start, 1, now())
  on conflict (user_id, key, bucket_start) do update
    set count = public.rate_limit_counters.count + 1,
        updated_at = now()
  returning count into v_count;

  if v_count > p_limit then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  return v_count;
end;
$$;

comment on function public.check_rate_limit is 'Increments and enforces a fixed-window per-user rate limit; raises on exceed';

-- ============================================================================
-- 7) Analytics events (server-side logging)
-- ============================================================================

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  anonymous_id text,
  event_name text not null,
  properties jsonb not null default '{}'::jsonb,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_analytics_events_name on public.analytics_events(event_name);
create index if not exists idx_analytics_events_user on public.analytics_events(user_id);
create index if not exists idx_analytics_events_created on public.analytics_events(created_at desc);

alter table public.analytics_events enable row level security;

-- No direct access; log via Edge Function or service role.
create policy "No direct access to analytics events"
  on public.analytics_events for select
  using (false);

-- ============================================================================
-- 8) Credit products (packs/offers)
-- ============================================================================

create table if not exists public.credit_products (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  stripe_price_id text not null,
  currency text not null default 'usd',
  base_credits integer not null check (base_credits > 0),
  bonus_credits integer not null default 0 check (bonus_credits >= 0),
  bonus_expires_days integer,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  popularity_rank integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_credit_products_active on public.credit_products(is_active);
create index if not exists idx_credit_products_window on public.credit_products(starts_at, ends_at);

alter table public.credit_products enable row level security;

create policy "Anyone can view active credit products"
  on public.credit_products for select
  to public
  using (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );

-- ============================================================================
-- 9) Migrate existing balances into the ledger (best-effort)
-- ============================================================================

do $$
declare
  r record;
begin
  for r in select user_id, balance from public.credits where balance > 0 loop
    perform public.grant_credits(
      r.user_id,
      r.balance,
      'allowance',
      'legacy_balance_migration',
      null,
      'legacy:migration:v1',
      jsonb_build_object('note','migrated from credits.balance'),
      null,
      null
    );
  end loop;
end $$;

-- ============================================================================
-- 10) Update user creation trigger: endowment + referral
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_display_name text;
  v_referral_code text;
begin
  v_display_name := COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1));

  insert into public.profiles (id, email, display_name)
  values (NEW.id, NEW.email, v_display_name)
  on conflict (id) do update
    set email = excluded.email,
        display_name = excluded.display_name,
        updated_at = now();

  insert into public.user_roles (user_id, role)
  values (NEW.id, 'user')
  on conflict (user_id, role) do nothing;

  -- Legacy table (kept for compatibility with earlier schema).
  insert into public.user_credits (user_id)
  values (NEW.id)
  on conflict (user_id) do nothing;

  -- Ensure referral code exists for share.
  perform public.get_or_create_referral_code(NEW.id);

  -- Endowment: starter bonus credits (expiring for urgency).
  perform public.grant_credits(
    NEW.id,
    50,
    'bonus',
    'starter_endowment',
    now() + interval '14 days',
    'starter:' || NEW.id::text,
    jsonb_build_object('reason', 'welcome'),
    null,
    null
  );

  -- If signup included a referral code, redeem it (never block signup).
  v_referral_code := nullif(NEW.raw_user_meta_data->>'referral_code', '');
  if v_referral_code is not null then
    begin
      perform public.redeem_referral(NEW.id, v_referral_code);
    exception when others then
      -- swallow
    end;
  end if;

  return NEW;
end;
$$;

-- ============================================================================
-- 11) Lock down internal RPCs (Edge Functions / service_role only)
-- ============================================================================

revoke execute on function public.refresh_credits_balance(uuid) from public;
revoke execute on function public.grant_credits(uuid, integer, public.credit_bucket, text, timestamptz, text, jsonb, text, text) from public;
revoke execute on function public.spend_credits(uuid, integer, text, text, jsonb) from public;
revoke execute on function public.get_or_create_referral_code(uuid) from public;
revoke execute on function public.redeem_referral(uuid, text) from public;
revoke execute on function public.award_referral_conversion(uuid, text) from public;
revoke execute on function public.claim_daily_credits(uuid) from public;
revoke execute on function public.check_rate_limit(uuid, text, integer, integer) from public;

grant execute on function public.refresh_credits_balance(uuid) to service_role;
grant execute on function public.grant_credits(uuid, integer, public.credit_bucket, text, timestamptz, text, jsonb, text, text) to service_role;
grant execute on function public.spend_credits(uuid, integer, text, text, jsonb) to service_role;
grant execute on function public.get_or_create_referral_code(uuid) to service_role;
grant execute on function public.redeem_referral(uuid, text) to service_role;
grant execute on function public.award_referral_conversion(uuid, text) to service_role;
grant execute on function public.claim_daily_credits(uuid) to service_role;
grant execute on function public.check_rate_limit(uuid, text, integer, integer) to service_role;

