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
