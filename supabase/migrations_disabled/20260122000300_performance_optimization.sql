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
