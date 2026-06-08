-- Persistent rate limit buckets for costly server endpoints.
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identifier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(identifier, endpoint, window_start)
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_lookup
  ON api_rate_limits(identifier, endpoint, window_start DESC);

ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage api rate limits" ON api_rate_limits;
CREATE POLICY "Service role can manage api rate limits"
  ON api_rate_limits FOR ALL USING (auth.role() = 'service_role');