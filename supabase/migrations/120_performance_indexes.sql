-- BijakBeli Performance Indexes
-- Migration 120: Add missing indexes for common query patterns

-- ============================================================================
-- OFFERS TABLE INDEXES
-- ============================================================================

-- Most common: get offers by product, sorted by price
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_offers_product_price 
ON offers(product_id, current_price ASC);

-- Filter by marketplace
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_offers_marketplace 
ON offers(marketplace_id);

-- Filter by validation status (admin dashboard)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_offers_validation_status 
ON offers(validation_status) WHERE is_active = true;

-- Filter by confidence score (low confidence alerts)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_offers_confidence 
ON offers(confidence_score) WHERE confidence_score < 70;

-- Composite: product + marketplace + active
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_offers_product_marketplace_active 
ON offers(product_id, marketplace_id) WHERE is_active = true;

-- ============================================================================
-- PRICES TABLE INDEXES
-- ============================================================================

-- Most common: get prices by product
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prices_product 
ON prices(product_id);

-- Filter by last_updated (stale data detection)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prices_last_updated 
ON prices(last_updated DESC);

-- Composite: product + marketplace
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prices_product_marketplace 
ON prices(product_id, marketplace_id);

-- ============================================================================
-- PRICE_HISTORY TABLE INDEXES
-- ============================================================================

-- Most common: get history by product, sorted by date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_price_history_product_date 
ON price_history(product_id, recorded_at DESC);

-- Filter by recorded_at range
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_price_history_recorded_at 
ON price_history(recorded_at DESC);

-- ============================================================================
-- CRAWL_TARGETS TABLE INDEXES
-- ============================================================================

-- Priority queue: get next targets to crawl
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crawl_targets_priority 
ON crawl_targets(priority_score DESC, next_crawl_at ASC) 
WHERE status = 'active';

-- Filter by product
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crawl_targets_product 
ON crawl_targets(product_id);

-- ============================================================================
-- PRODUCTS TABLE INDEXES
-- ============================================================================

-- Search by name (text search)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name_search 
ON products USING gin(to_tsvector('indonesian', name));

-- Filter by category
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category 
ON products(category);

-- Filter by deal_score (deals page)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_deal_score 
ON products(deal_score DESC NULLS LAST);

-- ============================================================================
-- AI_CACHE TABLE INDEXES
-- ============================================================================

-- Cache lookup by product + expiry
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_cache_product_expiry 
ON ai_cache(product_id, expires_at DESC);

-- ============================================================================
-- RATE_LIMITS TABLE INDEXES
-- ============================================================================

-- Rate limit check (identifier + window)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rate_limits_lookup 
ON rate_limits(identifier, endpoint, window_start);

-- Cleanup old windows
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rate_limits_cleanup 
ON rate_limits(window_start) WHERE window_start < NOW() - INTERVAL '1 day';

-- ============================================================================
-- REVIEWS TABLE INDEXES
-- ============================================================================

-- Get reviews by product
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_product 
ON reviews(product_id, created_at DESC);

-- User's reviews
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_user 
ON reviews(user_id) WHERE user_id IS NOT NULL;

-- ============================================================================
-- WISHLISTS TABLE INDEXES
-- ============================================================================

-- User's wishlist
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wishlists_user 
ON wishlists(user_id, created_at DESC);

-- ============================================================================
-- PRICE_ALERTS TABLE INDEXES
-- ============================================================================

-- Active alerts for price check
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_price_alerts_active 
ON price_alerts(product_id, is_active) WHERE is_active = true;

-- User's alerts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_price_alerts_user 
ON price_alerts(user_id);

-- ============================================================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================================================

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
