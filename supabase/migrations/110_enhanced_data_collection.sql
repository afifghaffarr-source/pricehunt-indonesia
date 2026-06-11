-- Migration 110: Enhanced Data Collection System
-- Purpose: Add tables and fields for semi-automated browser collector + targeted refresh
-- Part of: BijakBeli.app realistic data collection MVP

-- ============================================================================
-- ENHANCE: offers table with missing fields for browser collector
-- ============================================================================

-- Add fields for better product display and validation
ALTER TABLE offers ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS category_hint TEXT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS validation_status TEXT NOT NULL DEFAULT 'pending' 
  CHECK (validation_status IN ('pending', 'valid', 'conflict', 'parser_error', 'stale', 'rejected'));
ALTER TABLE offers ADD COLUMN IF NOT EXISTS confidence_label TEXT;

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_offers_validation_status ON offers(validation_status);
CREATE INDEX IF NOT EXISTS idx_offers_category_hint ON offers(category_hint);

COMMENT ON COLUMN offers.title IS 'Product title from marketplace (may differ slightly from products.name)';
COMMENT ON COLUMN offers.image_url IS 'Product image URL from marketplace (fallback to category template if null)';
COMMENT ON COLUMN offers.category_hint IS 'Category hint for template image fallback';
COMMENT ON COLUMN offers.validation_status IS 'Data validation status: pending, valid, conflict, parser_error, stale, rejected';
COMMENT ON COLUMN offers.confidence_label IS 'Human-readable confidence: sangat dipercaya, dipercaya, cukup dipercaya, perlu dicek ulang, data belum pasti';

-- ============================================================================
-- TABLE: crawl_targets
-- Targeted URL refresh queue with priority scoring
-- ============================================================================

CREATE TABLE IF NOT EXISTS crawl_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  domain TEXT,
  marketplace_id UUID REFERENCES marketplaces(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
  priority_score INT NOT NULL DEFAULT 50 CHECK (priority_score >= 0 AND priority_score <= 100),
  crawl_status TEXT NOT NULL DEFAULT 'queued' 
    CHECK (crawl_status IN ('queued', 'processing', 'success', 'failed', 'blocked', 'paused', 'disabled')),
  last_crawled_at TIMESTAMPTZ,
  next_crawl_at TIMESTAMPTZ,
  last_status_code INT,
  error_count INT NOT NULL DEFAULT 0 CHECK (error_count >= 0),
  error_message TEXT,
  source TEXT NOT NULL DEFAULT 'manual_admin',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for targeted refresh scheduler
CREATE INDEX IF NOT EXISTS idx_crawl_targets_next_crawl_at ON crawl_targets(next_crawl_at) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_crawl_targets_priority_score ON crawl_targets(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_crawl_targets_status ON crawl_targets(crawl_status);
CREATE INDEX IF NOT EXISTS idx_crawl_targets_product_id ON crawl_targets(product_id);
CREATE INDEX IF NOT EXISTS idx_crawl_targets_offer_id ON crawl_targets(offer_id);
CREATE INDEX IF NOT EXISTS idx_crawl_targets_domain ON crawl_targets(domain);

COMMENT ON TABLE crawl_targets IS 'Queue for targeted URL refresh with priority scoring. NOT for mass scraping - used for wishlists, price alerts, and user-requested rechecks.';

-- ============================================================================
-- TABLE: recheck_requests
-- User-initiated price recheck requests
-- ============================================================================

CREATE TABLE IF NOT EXISTS recheck_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  request_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (request_status IN ('pending', 'processing', 'done', 'failed', 'ignored')),
  priority_score INT NOT NULL DEFAULT 50 CHECK (priority_score >= 0 AND priority_score <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  result_message TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recheck_requests_status ON recheck_requests(request_status);
CREATE INDEX IF NOT EXISTS idx_recheck_requests_offer_id ON recheck_requests(offer_id);
CREATE INDEX IF NOT EXISTS idx_recheck_requests_product_id ON recheck_requests(product_id);
CREATE INDEX IF NOT EXISTS idx_recheck_requests_requested_by ON recheck_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_recheck_requests_created_at ON recheck_requests(created_at DESC);

COMMENT ON TABLE recheck_requests IS 'User-initiated requests to recheck product prices. Helps prioritize targeted refresh.';

-- ============================================================================
-- TABLE: price_reports
-- User reports for incorrect/outdated prices
-- ============================================================================

CREATE TABLE IF NOT EXISTS price_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL
    CHECK (report_type IN ('harga_berbeda', 'produk_salah', 'stok_habis', 'link_rusak', 'varian_berbeda', 'lainnya')),
  message TEXT,
  reported_price NUMERIC CHECK (reported_price IS NULL OR reported_price >= 0),
  report_status TEXT NOT NULL DEFAULT 'open'
    CHECK (report_status IN ('open', 'investigating', 'resolved', 'invalid')),
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_price_reports_status ON price_reports(report_status);
CREATE INDEX IF NOT EXISTS idx_price_reports_offer_id ON price_reports(offer_id);
CREATE INDEX IF NOT EXISTS idx_price_reports_product_id ON price_reports(product_id);
CREATE INDEX IF NOT EXISTS idx_price_reports_user_id ON price_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_price_reports_created_at ON price_reports(created_at DESC);

COMMENT ON TABLE price_reports IS 'User-submitted reports about incorrect or outdated prices. Transparency and quality control.';

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- crawl_targets: Admin only
ALTER TABLE crawl_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages crawl targets"
  ON crawl_targets FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- recheck_requests: Users can insert, service role manages
ALTER TABLE recheck_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can create recheck requests"
  ON recheck_requests FOR INSERT
  TO authenticated
  WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Users can view their own recheck requests"
  ON recheck_requests FOR SELECT
  TO authenticated
  USING (requested_by = auth.uid());

CREATE POLICY "Service role manages recheck requests"
  ON recheck_requests FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- price_reports: Users can insert their own, service role manages
ALTER TABLE price_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can create price reports"
  ON price_reports FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own price reports"
  ON price_reports FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role manages price reports"
  ON price_reports FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate next crawl time based on priority
CREATE OR REPLACE FUNCTION calculate_next_crawl_at(priority_score INT)
RETURNS TIMESTAMPTZ AS $$
BEGIN
  RETURN CASE
    WHEN priority_score >= 90 THEN NOW() + INTERVAL '30 minutes'  -- High priority: 30min
    WHEN priority_score >= 70 THEN NOW() + INTERVAL '2 hours'      -- Medium-high: 2h
    WHEN priority_score >= 40 THEN NOW() + INTERVAL '8 hours'      -- Medium: 8h
    WHEN priority_score >= 10 THEN NOW() + INTERVAL '1 day'        -- Low: 1 day
    ELSE NOW() + INTERVAL '3 days'                                  -- Very low: 3 days
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_next_crawl_at IS 'Calculate next crawl time based on priority score. High priority = more frequent updates.';

-- Function to auto-update crawl_targets.updated_at
CREATE OR REPLACE FUNCTION update_crawl_targets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER crawl_targets_updated_at
  BEFORE UPDATE ON crawl_targets
  FOR EACH ROW
  EXECUTE FUNCTION update_crawl_targets_updated_at();

-- ============================================================================
-- SEED DATA: Default data sources
-- ============================================================================

INSERT INTO data_sources (name, type, priority, reliability_score, is_active, rate_limit_per_hour)
VALUES 
  ('browser_collector', 'extension_snapshot', 80, 82, true, 60),
  ('manual_admin', 'manual_admin', 90, 90, true, 100),
  ('targeted_crawler', 'targeted_scraper', 70, 75, true, 30)
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE data_sources IS 'Configuration for different data collection sources. Browser collector = semi-automated Playwright tool.';
