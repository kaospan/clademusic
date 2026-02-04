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
