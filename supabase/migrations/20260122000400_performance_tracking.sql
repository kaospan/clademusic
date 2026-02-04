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
