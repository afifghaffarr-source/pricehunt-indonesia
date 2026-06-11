-- BijakBeli.app - API Registry Schema

CREATE TABLE IF NOT EXISTS api_source_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES api_source_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  provider TEXT,
  documentation_url TEXT,
  base_url TEXT,
  auth_type TEXT DEFAULT 'none',
  requires_api_key BOOLEAN DEFAULT FALSE,
  is_official BOOLEAN DEFAULT FALSE,
  is_unofficial BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned','testing','active','limited','deprecated','failed')),
  use_case TEXT[] DEFAULT '{}',
  priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 4),
  pricing_note TEXT,
  rate_limit_note TEXT,
  risk_note TEXT,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_sources_category ON api_sources(category_id);
CREATE INDEX IF NOT EXISTS idx_api_sources_status ON api_sources(status);
CREATE INDEX IF NOT EXISTS idx_api_sources_priority ON api_sources(priority);

CREATE TABLE IF NOT EXISTS api_source_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_source_id UUID REFERENCES api_sources(id) ON DELETE CASCADE,
  credential_name TEXT NOT NULL,
  env_key_name TEXT NOT NULL,
  is_configured BOOLEAN DEFAULT FALSE,
  last_validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_creds_source ON api_source_credentials(api_source_id);

CREATE TABLE IF NOT EXISTS api_source_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_source_id UUID REFERENCES api_sources(id) ON DELETE CASCADE,
  endpoint TEXT,
  method TEXT,
  status_code INTEGER,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  duration_ms INTEGER,
  requested_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_usage_source ON api_source_usage_logs(api_source_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_time ON api_source_usage_logs(requested_at DESC);

CREATE TABLE IF NOT EXISTS api_source_health_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_source_id UUID REFERENCES api_sources(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  response_time_ms INTEGER,
  message TEXT,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_health_source ON api_source_health_checks(api_source_id);

ALTER TABLE api_source_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_source_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_source_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_source_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read categories" ON api_source_categories FOR SELECT USING (TRUE);
CREATE POLICY "Public read sources" ON api_sources FOR SELECT USING (TRUE);
CREATE POLICY "Service role manage sources" ON api_sources FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role manage creds" ON api_source_credentials FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role manage usage" ON api_source_usage_logs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role manage health" ON api_source_health_checks FOR ALL USING (auth.role() = 'service_role');