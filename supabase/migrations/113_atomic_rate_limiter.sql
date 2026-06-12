-- Migration 113: Atomic Rate Limiter Function
-- Created: 2026-06-12
-- Purpose: Prevent race conditions in rate limiting by using atomic increment

-- ============================================================================
-- ATOMIC RATE LIMIT FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_window_start TIMESTAMPTZ,
  p_limit INTEGER
)
RETURNS TABLE (
  current_count INTEGER,
  allowed BOOLEAN,
  remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Insert or update atomically using ON CONFLICT
  INSERT INTO api_rate_limits (
    identifier,
    endpoint,
    window_start,
    count,
    created_at,
    updated_at
  )
  VALUES (
    p_identifier,
    p_endpoint,
    p_window_start,
    1,
    NOW(),
    NOW()
  )
  ON CONFLICT (identifier, endpoint, window_start)
  DO UPDATE SET
    count = api_rate_limits.count + 1,
    updated_at = NOW()
  RETURNING api_rate_limits.count INTO v_count;

  -- Return the result
  RETURN QUERY SELECT
    v_count::INTEGER AS current_count,
    (v_count <= p_limit)::BOOLEAN AS allowed,
    GREATEST(0, p_limit - v_count)::INTEGER AS remaining;
END;
$$;

-- Grant execute to authenticated and anon users
GRANT EXECUTE ON FUNCTION increment_rate_limit(TEXT, TEXT, TIMESTAMPTZ, INTEGER) TO authenticated, anon;

-- ============================================================================
-- ADD UNIQUE CONSTRAINT IF NOT EXISTS
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'api_rate_limits_identifier_endpoint_window_key'
  ) THEN
    ALTER TABLE api_rate_limits
    ADD CONSTRAINT api_rate_limits_identifier_endpoint_window_key
    UNIQUE (identifier, endpoint, window_start);
  END IF;
END $$;

-- ============================================================================
-- CLEANUP OLD RATE LIMIT ENTRIES (Optional)
-- ============================================================================

-- Function to clean up old rate limit entries (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM api_rate_limits
  WHERE window_start < NOW() - INTERVAL '24 hours';
$$;

-- You can schedule this via pg_cron or run manually:
-- SELECT cleanup_old_rate_limits();

COMMENT ON FUNCTION increment_rate_limit IS 'Atomically increment rate limit counter and return current status';
COMMENT ON FUNCTION cleanup_old_rate_limits IS 'Remove rate limit entries older than 24 hours';
