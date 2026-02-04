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
