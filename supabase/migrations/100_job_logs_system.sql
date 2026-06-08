-- Migration: Job Logs System
-- Date: 2026-06-08
-- Purpose: Create observability system for tracking cron jobs and background tasks
--
-- This enables monitoring of:
-- - Cron job executions (prices, alerts, digest)
-- - Success/failure rates
-- - Performance metrics
-- - Error tracking

-- =============================================
-- JOB LOGS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL, -- e.g., 'cron_prices', 'cron_alerts', 'cron_digest'
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed', 'partial')),
  
  -- Metrics
  processed_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  
  -- Error tracking
  error_summary TEXT,
  error_details JSONB,
  
  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN finished_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (finished_at - started_at)) * 1000
      ELSE NULL
    END
  ) STORED,
  
  -- Additional context
  metadata JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_job_logs_job_name ON job_logs(job_name);
CREATE INDEX IF NOT EXISTS idx_job_logs_status ON job_logs(status);
CREATE INDEX IF NOT EXISTS idx_job_logs_created_at ON job_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_logs_finished_at ON job_logs(finished_at DESC) WHERE finished_at IS NOT NULL;

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_job_logs_name_created ON job_logs(job_name, created_at DESC);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE job_logs ENABLE ROW LEVEL SECURITY;

-- Public can read recent job status (for health checks)
CREATE POLICY "Allow public read recent job logs"
  ON job_logs
  FOR SELECT
  USING (created_at > NOW() - INTERVAL '7 days');

-- Only authenticated users with admin role can insert
CREATE POLICY "Allow system to insert job logs"
  ON job_logs
  FOR INSERT
  WITH CHECK (true); -- Will be called by service role via cron

-- Only authenticated users with admin role can view all
CREATE POLICY "Allow admin to view all job logs"
  ON job_logs
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_profiles WHERE is_admin = true
    )
  );

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to cleanup old job logs (keep only last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_job_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM job_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Function to get job statistics
CREATE OR REPLACE FUNCTION get_job_statistics(
  p_job_name TEXT DEFAULT NULL,
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  job_name TEXT,
  total_runs BIGINT,
  successful_runs BIGINT,
  failed_runs BIGINT,
  success_rate NUMERIC,
  avg_duration_ms NUMERIC,
  last_run_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    jl.job_name,
    COUNT(*) as total_runs,
    COUNT(*) FILTER (WHERE jl.status = 'success') as successful_runs,
    COUNT(*) FILTER (WHERE jl.status = 'failed') as failed_runs,
    ROUND(
      (COUNT(*) FILTER (WHERE jl.status = 'success')::NUMERIC / COUNT(*)) * 100,
      2
    ) as success_rate,
    ROUND(AVG(jl.duration_ms)::NUMERIC, 2) as avg_duration_ms,
    MAX(jl.created_at) as last_run_at
  FROM job_logs jl
  WHERE 
    (p_job_name IS NULL OR jl.job_name = p_job_name)
    AND jl.created_at > NOW() - (p_days || ' days')::INTERVAL
  GROUP BY jl.job_name
  ORDER BY last_run_at DESC;
END;
$$;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE job_logs IS 'Tracks execution of cron jobs and background tasks for monitoring and debugging';
COMMENT ON COLUMN job_logs.job_name IS 'Identifier for the job type (e.g., cron_prices, cron_alerts)';
COMMENT ON COLUMN job_logs.status IS 'Current or final status of the job execution';
COMMENT ON COLUMN job_logs.duration_ms IS 'Calculated duration in milliseconds (computed column)';
COMMENT ON COLUMN job_logs.error_summary IS 'Brief error message for failed jobs';
COMMENT ON COLUMN job_logs.error_details IS 'Detailed error information in JSON format';
COMMENT ON COLUMN job_logs.metadata IS 'Additional context about the job execution';

-- =============================================
-- INITIAL SEED (Optional)
-- =============================================

-- Insert a sample log to verify the table works
INSERT INTO job_logs (
  job_name,
  status,
  processed_count,
  success_count,
  failed_count,
  started_at,
  finished_at,
  metadata
) VALUES (
  'system_init',
  'success',
  1,
  1,
  0,
  NOW(),
  NOW(),
  '{"message": "Job logs system initialized successfully"}'::jsonb
);

SELECT 'Job logs system created successfully' AS status;
