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
