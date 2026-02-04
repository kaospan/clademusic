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
