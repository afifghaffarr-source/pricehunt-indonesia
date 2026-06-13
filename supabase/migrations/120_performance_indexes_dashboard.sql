-- BijakBeli Performance Indexes
-- Migration 120 (Dashboard version): Apply in Supabase SQL Editor
-- NOTE: Hapus CONCURRENTLY karena Supabase SQL Editor pakai transaction
--
-- CHANGELOG (Phase 3 hardening): mirror of 120_performance_indexes.sql
-- - Replaced `status` with `crawl_status` on idx_crawl_targets_priority
-- - Removed volatile NOW() predicate from idx_rate_limits_cleanup
-- - Replaced `indonesian` tsvector config with portable `simple` + pg_trgm
-- - Added pg_trgm extension creation if missing

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- BATCH 1: OFFERS TABLE
CREATE INDEX IF NOT EXISTS idx_offers_product_price
ON offers(product_id, current_price ASC);

CREATE INDEX IF NOT EXISTS idx_offers_marketplace
ON offers(marketplace_id);

CREATE INDEX IF NOT EXISTS idx_offers_validation_status
ON offers(validation_status) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_offers_confidence
ON offers(confidence_score) WHERE confidence_score < 70;

CREATE INDEX IF NOT EXISTS idx_offers_product_marketplace_active
ON offers(product_id, marketplace_id) WHERE is_active = true;

-- BATCH 2: PRICES TABLE
CREATE INDEX IF NOT EXISTS idx_prices_product
ON prices(product_id);

CREATE INDEX IF NOT EXISTS idx_prices_last_updated
ON prices(last_updated DESC);

CREATE INDEX IF NOT EXISTS idx_prices_product_marketplace
ON prices(product_id, marketplace_id);

-- BATCH 3: PRICE_HISTORY TABLE
CREATE INDEX IF NOT EXISTS idx_price_history_product_date
ON price_history(product_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_price_history_recorded_at
ON price_history(recorded_at DESC);

-- BATCH 4: CRAWL_TARGETS TABLE
-- FIXED: column is `crawl_status` (not `status`)
CREATE INDEX IF NOT EXISTS idx_crawl_targets_priority
ON crawl_targets(priority_score DESC, next_crawl_at ASC)
WHERE crawl_status = 'queued';

CREATE INDEX IF NOT EXISTS idx_crawl_targets_product
ON crawl_targets(product_id);

-- BATCH 5: PRODUCTS TABLE
-- FIXED: use portable trigram + simple tsvector indexes.
-- The `indonesian` text search config is not installed by default on
-- Supabase. `pg_trgm` covers ILIKE search and `simple` tsvector
-- covers stemming-free full-text search.
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
ON products USING gin(name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_name_search
ON products USING gin(to_tsvector('simple', name));

CREATE INDEX IF NOT EXISTS idx_products_category
ON products(category);

CREATE INDEX IF NOT EXISTS idx_products_deal_score
ON products(deal_score DESC NULLS LAST);

-- BATCH 6: AI_CACHE TABLE
CREATE INDEX IF NOT EXISTS idx_ai_cache_product_expiry
ON ai_cache(product_id, expires_at DESC);

-- BATCH 7: RATE_LIMITS TABLE
-- FIXED: removed volatile `WHERE window_start < NOW() - INTERVAL '1 day'`
-- predicate (partial indexes require IMMUTABLE predicates).
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
ON rate_limits(identifier, endpoint, window_start);

CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup
ON rate_limits(window_start);

-- BATCH 8: REVIEWS TABLE
CREATE INDEX IF NOT EXISTS idx_reviews_product
ON reviews(product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_user
ON reviews(user_id) WHERE user_id IS NOT NULL;

-- BATCH 9: WISHLISTS TABLE
CREATE INDEX IF NOT EXISTS idx_wishlists_user
ON wishlists(user_id, created_at DESC);

-- BATCH 10: PRICE_ALERTS TABLE
CREATE INDEX IF NOT EXISTS idx_price_alerts_active
ON price_alerts(product_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_price_alerts_user
ON price_alerts(user_id);

-- BATCH 11: ANALYZE TABLES
ANALYZE offers;
ANALYZE prices;
ANALYZE price_history;
ANALYZE crawl_targets;
ANALYZE products;
ANALYZE ai_cache;
ANALYZE rate_limits;
ANALYZE reviews;
ANALYZE wishlists;
ANALYZE price_alerts;
