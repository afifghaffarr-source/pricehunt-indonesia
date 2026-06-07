-- =============================================
-- Product Reviews System
-- =============================================

-- Product Reviews Table
CREATE TABLE product_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT NOT NULL,
  helpful_count INTEGER DEFAULT 0,
  verified_purchase BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- One review per user per product
  UNIQUE(product_id, user_id)
);

-- Review Helpfulness Tracking (prevent duplicate votes)
CREATE TABLE review_helpfulness (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_reviews_product ON product_reviews(product_id);
CREATE INDEX idx_reviews_user ON product_reviews(user_id);
CREATE INDEX idx_reviews_rating ON product_reviews(rating);
CREATE INDEX idx_reviews_created ON product_reviews(created_at DESC);
CREATE INDEX idx_review_helpfulness_review ON review_helpfulness(review_id);
CREATE INDEX idx_review_helpfulness_user ON review_helpfulness(user_id);

-- Function to update helpful_count when helpfulness is added/removed
CREATE OR REPLACE FUNCTION update_review_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE product_reviews 
    SET helpful_count = helpful_count + 1 
    WHERE id = NEW.review_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE product_reviews 
    SET helpful_count = helpful_count - 1 
    WHERE id = OLD.review_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update helpful_count
CREATE TRIGGER trigger_review_helpful_count
AFTER INSERT OR DELETE ON review_helpfulness
FOR EACH ROW
EXECUTE FUNCTION update_review_helpful_count();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on review edits
CREATE TRIGGER trigger_reviews_updated_at
BEFORE UPDATE ON product_reviews
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_helpfulness ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews
CREATE POLICY "Public can view reviews"
  ON product_reviews FOR SELECT
  USING (true);

-- Users can create their own reviews (must be authenticated)
CREATE POLICY "Authenticated users can create reviews"
  ON product_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
  ON product_reviews FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews"
  ON product_reviews FOR DELETE
  USING (auth.uid() = user_id);

-- Anyone can read helpfulness data
CREATE POLICY "Public can view review helpfulness"
  ON review_helpfulness FOR SELECT
  USING (true);

-- Authenticated users can mark reviews as helpful
CREATE POLICY "Authenticated users can mark reviews helpful"
  ON review_helpfulness FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their own helpfulness marks
CREATE POLICY "Users can remove own helpfulness marks"
  ON review_helpfulness FOR DELETE
  USING (auth.uid() = user_id);
