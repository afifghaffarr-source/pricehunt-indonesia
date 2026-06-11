-- Migration 108: Data Ingestion System
-- Purpose: Add data sources tracking, ingestion logs, conflict detection, and enhanced offer/snapshot fields
-- Part of: Hybrid data ingestion architecture for BijakBeli.app

-- ============================================================================
-- TABLE: data_sources
-- Track reliability and configuration of different data sources
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('official_api', 'affiliate_feed', 'extension_snapshot', 'targeted_scraper', 'community_proof', 'manual_admin')),
  priority INT NOT NULL DEFAULT 50 CHECK (priority >= 0 AND priority <= 100),
  reliability_score INT NOT NULL DEFAULT 70 CHECK (reliability_score >= 0 AND reliability_score <= 100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  rate_limit_per_hour INT NOT NULL DEFAULT 100 CHECK (rate_limit_per_hour > 0),
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_sources_type ON data_sources(type);
CREATE INDEX IF NOT EXISTS idx_data_sources_is_active ON data_sources(is_active);

COMMENT ON TABLE data_sources IS 'Configuration and reliability tracking for different price data sources';

-- ============================================================================
-- TABLE: ingestion_logs
-- Audit trail for all data ingestion jobs
-- ============================================================================

CREATE TABLE IF NOT EXISTS ingestion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  job_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'partial', 'failed')),
  processed_count INT NOT NULL DEFAULT 0 CHECK (processed_count >= 0),
  success_count INT NOT NULL DEFAULT 0 CHECK (success_count >= 0),
  failed_count INT NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  error_summary TEXT,
  metadata JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingestion_logs_source ON ingestion_logs(source);
CREATE INDEX IF NOT EXISTS idx_ingestion_logs_status ON ingestion_logs(status);
CREATE INDEX IF NOT EXISTS idx_ingestion_logs_created_at ON ingestion_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ingestion_logs_job_name ON ingestion_logs(job_name);

COMMENT ON TABLE ingestion_logs IS 'Audit trail and monitoring for data ingestion jobs';

-- ============================================================================
-- TABLE: price_conflicts
-- Track price discrepancies between different sources
-- ============================================================================

CREATE TABLE IF NOT EXISTS price_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  source_a TEXT NOT NULL,
  price_a NUMERIC NOT NULL CHECK (price_a >= 0),
  snapshot_a_id UUID,
  source_b TEXT NOT NULL,
  price_b NUMERIC NOT NULL CHECK (price_b >= 0),
  snapshot_b_id UUID,
  difference_percent NUMERIC(5,2) NOT NULL,
  difference_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
  resolution_note TEXT,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID
);

CREATE INDEX IF NOT EXISTS idx_price_conflicts_offer_id ON price_conflicts(offer_id);
CREATE INDEX IF NOT EXISTS idx_price_conflicts_status ON price_conflicts(status);
CREATE INDEX IF NOT EXISTS idx_price_conflicts_detected_at ON price_conflicts(detected_at DESC);

COMMENT ON TABLE price_conflicts IS 'Auto-detected price conflicts between different data sources for quality assurance';

-- ============================================================================
-- ENHANCE: offers table
-- Add fields for better data tracking and confidence scoring
-- ============================================================================

-- Add new columns to offers table
ALTER TABLE offers ADD COLUMN IF NOT EXISTS seller_id TEXT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS seller_location TEXT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5));
ALTER TABLE offers ADD COLUMN IF NOT EXISTS review_count INT CHECK (review_count IS NULL OR review_count >= 0);
ALTER TABLE offers ADD COLUMN IF NOT EXISTS sold_count INT CHECK (sold_count IS NULL OR sold_count >= 0);
ALTER TABLE offers ADD COLUMN IF NOT EXISTS voucher_text TEXT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'system';
ALTER TABLE offers ADD COLUMN IF NOT EXISTS confidence_score INT DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100);
ALTER TABLE offers ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'IDR';

-- Add new indexes for enhanced fields
CREATE INDEX IF NOT EXISTS idx_offers_source ON offers(source);
CREATE INDEX IF NOT EXISTS idx_offers_confidence_score ON offers(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_offers_is_active ON offers(is_active);
CREATE INDEX IF NOT EXISTS idx_offers_seller_id ON offers(seller_id);

-- ============================================================================
-- ENHANCE: price_snapshots table
-- Add fields for better tracking and deduplication
-- ============================================================================

-- Add new columns to price_snapshots table
ALTER TABLE price_snapshots ADD COLUMN IF NOT EXISTS raw_hash TEXT;
ALTER TABLE price_snapshots ADD COLUMN IF NOT EXISTS stock_status TEXT CHECK (stock_status IS NULL OR stock_status IN ('in_stock', 'low_stock', 'out_of_stock', 'unknown'));
ALTER TABLE price_snapshots ADD COLUMN IF NOT EXISTS voucher_text TEXT;
ALTER TABLE price_snapshots ADD COLUMN IF NOT EXISTS shipping_estimate INT CHECK (shipping_estimate IS NULL OR shipping_estimate >= 0);

-- Add index for deduplication
CREATE INDEX IF NOT EXISTS idx_price_snapshots_raw_hash ON price_snapshots(raw_hash);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- data_sources: Read-only for public, admin writes
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active data sources"
  ON data_sources FOR SELECT
  USING (is_active = true);

CREATE POLICY "Service role manages data sources"
  ON data_sources FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ingestion_logs: Admin-only access
ALTER TABLE ingestion_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role reads ingestion logs"
  ON ingestion_logs FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role writes ingestion logs"
  ON ingestion_logs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- price_conflicts: Public read for transparency, admin writes
ALTER TABLE price_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read price conflicts"
  ON price_conflicts FOR SELECT
  USING (true);

CREATE POLICY "Service role manages price conflicts"
  ON price_conflicts FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- SEED DATA: Initial data sources
-- ============================================================================

INSERT INTO data_sources (name, type, priority, reliability_score, rate_limit_per_hour, config)
VALUES
  ('System', 'manual_admin', 90, 90, 1000, '{"description": "Manual admin input"}'),
  ('Extension', 'extension_snapshot', 80, 80, 100, '{"description": "User-initiated browser extension snapshots"}'),
  ('Community', 'community_proof', 70, 75, 50, '{"description": "Community-verified price proofs"}')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update confidence score based on various factors
CREATE OR REPLACE FUNCTION calculate_offer_confidence(
  p_source TEXT,
  p_last_checked_at TIMESTAMPTZ,
  p_has_seller BOOLEAN,
  p_is_official_store BOOLEAN,
  p_conflict_exists BOOLEAN
) RETURNS INT AS $$
DECLARE
  base_score INT := 70;
  source_bonus INT := 0;
  freshness_penalty INT := 0;
  completeness_bonus INT := 0;
  trust_bonus INT := 0;
  conflict_penalty INT := 0;
  hours_stale INT;
BEGIN
  -- Source type bonus
  source_bonus := CASE p_source
    WHEN 'manual_admin' THEN 20
    WHEN 'official_api' THEN 25
    WHEN 'extension_snapshot' THEN 10
    WHEN 'affiliate_feed' THEN 15
    ELSE 0
  END;
  
  -- Freshness penalty (based on hours since last check)
  IF p_last_checked_at IS NOT NULL THEN
    hours_stale := EXTRACT(EPOCH FROM (NOW() - p_last_checked_at)) / 3600;
    freshness_penalty := LEAST(30, (hours_stale / 24) * 5);
  END IF;
  
  -- Completeness bonus
  IF p_has_seller THEN
    completeness_bonus := completeness_bonus + 5;
  END IF;
  
  -- Trust bonus
  IF p_is_official_store THEN
    trust_bonus := 10;
  END IF;
  
  -- Conflict penalty
  IF p_conflict_exists THEN
    conflict_penalty := 15;
  END IF;
  
  -- Calculate final score
  RETURN GREATEST(0, LEAST(100, 
    base_score + source_bonus + completeness_bonus + trust_bonus 
    - freshness_penalty - conflict_penalty
  ));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_offer_confidence IS 'Calculate confidence score for an offer based on multiple factors';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Note: Existing offers and price_snapshots data will have default values for new columns
-- Run data backfill if needed to populate source, confidence_score, etc.
