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
