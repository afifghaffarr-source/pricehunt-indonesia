-- =============================================
-- BijakBeli.app — Reviews System Schema
-- =============================================
-- Migration: Add product reviews and ratings
-- Run this after 002_performance_indexes.sql
-- =============================================

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  pros TEXT,
  cons TEXT,
  verified_purchase BOOLEAN DEFAULT FALSE,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  is_approved BOOLEAN DEFAULT FALSE,
  is_flagged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id) -- One review per user per product
);

-- Review votes (track who found review helpful)
CREATE TABLE IF NOT EXISTS review_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_helpful BOOLEAN NOT NULL, -- true = helpful, false = not helpful
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, user_id) -- One vote per user per review
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_approved ON reviews(is_approved) WHERE is_approved = TRUE;
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_review_votes_review ON review_votes(review_id);

-- RLS Policies
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;

-- Everyone can read approved reviews
CREATE POLICY "Approved reviews are viewable by everyone"
  ON reviews FOR SELECT
  USING (is_approved = TRUE);

-- Users can view their own reviews (even if not approved)
CREATE POLICY "Users can view own reviews"
  ON reviews FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert reviews for products
CREATE POLICY "Users can create reviews"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reviews (only if not approved yet)
CREATE POLICY "Users can update own unapproved reviews"
  ON reviews FOR UPDATE
  USING (auth.uid() = user_id AND is_approved = FALSE);

-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews"
  ON reviews FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can manage all reviews (for moderation)
CREATE POLICY "Service role can manage reviews"
  ON reviews FOR ALL
  USING (auth.role() = 'service_role');

-- Review votes policies
CREATE POLICY "Users can view all votes"
  ON review_votes FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can create votes"
  ON review_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own votes"
  ON review_votes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes"
  ON review_votes FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger: Update helpful_count when votes change
CREATE OR REPLACE FUNCTION update_review_helpful_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE reviews
    SET 
      helpful_count = (
        SELECT COUNT(*) FROM review_votes 
        WHERE review_id = NEW.review_id AND is_helpful = TRUE
      ),
      not_helpful_count = (
        SELECT COUNT(*) FROM review_votes 
        WHERE review_id = NEW.review_id AND is_helpful = FALSE
      )
    WHERE id = NEW.review_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reviews
    SET 
      helpful_count = (
        SELECT COUNT(*) FROM review_votes 
        WHERE review_id = OLD.review_id AND is_helpful = TRUE
      ),
      not_helpful_count = (
        SELECT COUNT(*) FROM review_votes 
        WHERE review_id = OLD.review_id AND is_helpful = FALSE
      )
    WHERE id = OLD.review_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_review_helpful_counts
  AFTER INSERT OR UPDATE OR DELETE ON review_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_review_helpful_counts();

-- Trigger: Update products table with average rating
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE products
    SET specs = jsonb_set(
      COALESCE(specs, '{}'::jsonb),
      '{average_rating}',
      to_jsonb((
        SELECT ROUND(AVG(rating)::numeric, 1)
        FROM reviews
        WHERE product_id = NEW.product_id AND is_approved = TRUE
      ))
    ),
    specs = jsonb_set(
      COALESCE(specs, '{}'::jsonb),
      '{review_count}',
      to_jsonb((
        SELECT COUNT(*)
        FROM reviews
        WHERE product_id = NEW.product_id AND is_approved = TRUE
      ))
    )
    WHERE id = NEW.product_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE products
    SET specs = jsonb_set(
      COALESCE(specs, '{}'::jsonb),
      '{average_rating}',
      to_jsonb((
        SELECT ROUND(AVG(rating)::numeric, 1)
        FROM reviews
        WHERE product_id = OLD.product_id AND is_approved = TRUE
      ))
    ),
    specs = jsonb_set(
      COALESCE(specs, '{}'::jsonb),
      '{review_count}',
      to_jsonb((
        SELECT COUNT(*)
        FROM reviews
        WHERE product_id = OLD.product_id AND is_approved = TRUE
      ))
    )
    WHERE id = OLD.product_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  WHEN (NEW.is_approved = TRUE OR OLD.is_approved = TRUE)
  EXECUTE FUNCTION update_product_rating();

-- Trigger: Auto-update updated_at
CREATE TRIGGER trigger_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================
-- USAGE NOTES
-- =============================================
-- This schema provides:
-- - Product reviews with 1-5 star ratings
-- - Pros/cons fields for detailed feedback
-- - Review moderation (is_approved flag)
-- - Helpful voting system
-- - One review per user per product
-- - Automatic calculation of average ratings
-- - RLS for security
-- 
-- To implement the full reviews system, you'll need:
-- 1. API routes for CRUD operations
-- 2. Review form component
-- 3. Review display component
-- 4. Admin moderation interface
-- 5. Helpful voting UI
-- =============================================
