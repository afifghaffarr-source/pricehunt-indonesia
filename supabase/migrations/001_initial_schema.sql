-- =============================================
-- BijakBeli.app — Database Schema
-- =============================================
-- Jalankan seluruh SQL ini di Supabase SQL Editor
-- (Dashboard > SQL Editor > New Query > Paste > Run)
-- =============================================

-- 1. EXTENSIONS
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUM TYPES
-- =============================================
CREATE TYPE marketplace_name AS ENUM (
  'tokopedia', 'shopee', 'bukalapak', 'lazada', 'blibli', 'tiktok'
);

-- 3. TABLES
-- =============================================

-- Products: Data produk utama
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  specs JSONB DEFAULT '{}'::jsonb,
  ai_verdict TEXT,
  lowest_price INTEGER,
  highest_price INTEGER,
  average_price INTEGER,
  deal_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_deal_score ON products(deal_score DESC);

-- Marketplaces: Daftar marketplace
CREATE TABLE marketplaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name marketplace_name UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  color TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prices: Harga produk per marketplace (data terkini)
CREATE TABLE prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  marketplace_id UUID NOT NULL REFERENCES marketplaces(id) ON DELETE CASCADE,
  price INTEGER NOT NULL,
  url TEXT,
  seller TEXT,
  seller_rating NUMERIC(3,1),
  in_stock BOOLEAN DEFAULT TRUE,
  shipping_cost INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, marketplace_id)
);

CREATE INDEX idx_prices_product ON prices(product_id);
CREATE INDEX idx_prices_marketplace ON prices(marketplace_id);
CREATE INDEX idx_prices_price ON prices(price);

-- Price History: Riwayat harga harian
CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  marketplace_id UUID NOT NULL REFERENCES marketplaces(id) ON DELETE CASCADE,
  price INTEGER NOT NULL,
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, marketplace_id, recorded_at)
);

CREATE INDEX idx_price_history_product ON price_history(product_id);
CREATE INDEX idx_price_history_date ON price_history(recorded_at);

-- User Profiles: Data tambahan user (Supabase Auth handles auth_users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wishlists: Produk yang disimpan user
CREATE TABLE wishlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX idx_wishlists_user ON wishlists(user_id);

-- Price Alerts: Notifikasi harga turun
CREATE TABLE price_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  target_price INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_user ON price_alerts(user_id);
CREATE INDEX idx_alerts_active ON price_alerts(is_active) WHERE is_active = TRUE;

-- AI Cache: Cache hasil AI advisor
CREATE TABLE ai_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  verdict TEXT NOT NULL,
  model TEXT DEFAULT 'gpt-4o-mini',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_cache_product ON ai_cache(product_id);
CREATE INDEX idx_ai_cache_expires ON ai_cache(expires_at);

-- 4. ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cache ENABLE ROW LEVEL SECURITY;

-- Public read access for product data
CREATE POLICY "Products are viewable by everyone"
  ON products FOR SELECT USING (TRUE);

CREATE POLICY "Marketplaces are viewable by everyone"
  ON marketplaces FOR SELECT USING (TRUE);

CREATE POLICY "Prices are viewable by everyone"
  ON prices FOR SELECT USING (TRUE);

CREATE POLICY "Price history is viewable by everyone"
  ON price_history FOR SELECT USING (TRUE);

CREATE POLICY "AI cache is viewable by everyone"
  ON ai_cache FOR SELECT USING (TRUE);

-- User-specific policies
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own wishlists"
  ON wishlists FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wishlists"
  ON wishlists FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own wishlists"
  ON wishlists FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own alerts"
  ON price_alerts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alerts"
  ON price_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
  ON price_alerts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts"
  ON price_alerts FOR DELETE USING (auth.uid() = user_id);

-- Service role policies for data management
CREATE POLICY "Service role can manage products"
  ON products FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage prices"
  ON prices FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage price history"
  ON price_history FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage marketplaces"
  ON marketplaces FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage ai cache"
  ON ai_cache FOR ALL USING (auth.role() = 'service_role');

-- 5. FUNCTIONS & TRIGGERS
-- =============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_alerts_updated_at
  BEFORE UPDATE ON price_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 6. VIEWS
-- =============================================

-- Product summary view with computed fields
CREATE OR REPLACE VIEW product_summary AS
SELECT
  p.id,
  p.slug,
  p.name,
  p.category,
  p.image_url,
  p.deal_score,
  p.lowest_price,
  p.highest_price,
  p.average_price,
  COUNT(DISTINCT pr.id) AS marketplace_count,
  COUNT(DISTINCT CASE WHEN pr.in_stock THEN pr.id END) AS in_stock_count
FROM products p
LEFT JOIN prices pr ON pr.product_id = p.id
GROUP BY p.id;
