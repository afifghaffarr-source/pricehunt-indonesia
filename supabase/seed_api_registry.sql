-- PriceHunt Indonesia - API Registry Seed Data

INSERT INTO api_source_categories (name, slug, description) VALUES
('E-Commerce', 'e-commerce', 'API marketplace dan e-commerce Indonesia'),
('Jasa Pengiriman', 'jasa-pengiriman', 'API cek resi dan estimasi pengiriman'),
('Lokasi', 'lokasi', 'API wilayah, alamat, kode pos Indonesia'),
('Sosial Media', 'sosial-media', 'API social media dan messaging'),
('Utilitas', 'utilitas', 'API utilitas umum seperti terjemahan dan screenshot'),
('Payment', 'payment', 'API payment gateway Indonesia')
ON CONFLICT (slug) DO NOTHING;

DO $$
DECLARE
  cat_ecom UUID; cat_ship UUID; cat_loc UUID; cat_soc UUID; cat_util UUID; cat_pay UUID;
BEGIN
  SELECT id INTO cat_ecom FROM api_source_categories WHERE slug = 'e-commerce';
  SELECT id INTO cat_ship FROM api_source_categories WHERE slug = 'jasa-pengiriman';
  SELECT id INTO cat_loc FROM api_source_categories WHERE slug = 'lokasi';
  SELECT id INTO cat_soc FROM api_source_categories WHERE slug = 'sosial-media';
  SELECT id INTO cat_util FROM api_source_categories WHERE slug = 'utilitas';
  SELECT id INTO cat_pay FROM api_source_categories WHERE slug = 'payment';

  INSERT INTO api_sources (category_id, name, slug, provider, documentation_url, base_url, auth_type, requires_api_key, is_official, is_unofficial, status, use_case, priority, pricing_note, rate_limit_note, risk_note) VALUES
  (cat_ecom, 'Shopee Open Platform', 'shopee-api', 'Shopee', 'https://open.shopee.com', 'https://partner.shopeemobile.com', 'oauth2', TRUE, TRUE, FALSE, 'planned', ARRAY['product_search','product_detail','price_sync','seller_info'], 1, 'Free tier available', 'Varies by endpoint', NULL),
  (cat_ecom, 'Tokopedia Open API', 'tokopedia-api', 'Tokopedia', 'https://developer.tokopedia.com', 'https://gql.tokopedia.com', 'oauth2', TRUE, TRUE, FALSE, 'planned', ARRAY['product_search','product_detail','price_sync','seller_info'], 1, 'Free for registered sellers', 'Rate limited per app', NULL),
  (cat_ecom, 'Lazada Open Platform', 'lazada-api', 'Lazada', 'https://open.lazada.com', 'https://api.lazada.sg/rest', 'oauth2', TRUE, TRUE, FALSE, 'planned', ARRAY['product_search','product_detail','price_sync'], 2, 'Free tier available', 'Varies', NULL),
  (cat_ecom, 'Blibli Merchant API', 'blibli-api', 'Blibli', 'https://docs.blibli.com', 'https://api.blibli.com/v2', 'oauth2', TRUE, TRUE, FALSE, 'planned', ARRAY['product_search','product_detail','price_sync'], 2, 'For registered merchants', 'Standard rate limit', NULL),
  (cat_ecom, 'Matahari Mall Seller API', 'matahari-api', 'Matahari Mall', 'https://seller.matahari.com', 'https://api.matahari.com', 'api_key', TRUE, TRUE, FALSE, 'planned', ARRAY['product_search','seller_info'], 3, 'For sellers only', 'Unknown', 'Limited documentation'),
  (cat_ship, 'Binderbyte Cek Resi', 'binderbyte-resi', 'Binderbyte', 'https://binderbyte.com/docs', 'https://api.binderbyte.com/v1', 'api_key', TRUE, FALSE, TRUE, 'planned', ARRAY['tracking'], 1, 'Free 100 req/day, paid plans', '100/day free tier', 'Unofficial wrapper'),
  (cat_ship, 'J&T Official API', 'jnt-api', 'J&T Express', 'https://www.jet.co.id/api', 'https://api.jet.co.id', 'api_key', TRUE, TRUE, FALSE, 'planned', ARRAY['tracking','shipping_estimate'], 1, 'Contact J&T for access', 'Unknown', NULL),
  (cat_ship, 'JNE Official API', 'jne-api', 'JNE', 'https://www.jne.co.id/api', 'https://api.jne.co.id', 'api_key', TRUE, TRUE, FALSE, 'planned', ARRAY['tracking','shipping_estimate'], 1, 'Contact JNE for access', 'Unknown', NULL),
  (cat_ship, 'KiriminAja API', 'kiriminaja-api', 'KiriminAja', 'https://docs.kiriminaja.com', 'https://api.kiriminaja.com', 'api_key', TRUE, TRUE, FALSE, 'planned', ARRAY['shipping_estimate','tracking'], 2, 'Free tier available', 'Standard rate limit', NULL),
  (cat_ship, 'Shipper API', 'shipper-api', 'Shipper', 'https://docs.shipper.id', 'https://api.shipper.id', 'api_key', TRUE, TRUE, FALSE, 'planned', ARRAY['shipping_estimate','tracking'], 2, 'Free tier available', 'Standard rate limit', NULL),
  (cat_ship, 'Klik Resi Tracking API', 'klik-resi', 'Klik Resi', 'https://klikresi.com', 'https://api.klikresi.com', 'api_key', FALSE, FALSE, TRUE, 'planned', ARRAY['tracking'], 3, 'Free tier available', 'Limited', 'Unofficial aggregator'),
  (cat_loc, 'API Wilayah Indonesia', 'api-wilayah', 'Kemendagri', 'https://github.com/fitygas/api-wilayah', 'https://api-wilayah.fly.dev', 'none', FALSE, TRUE, FALSE, 'planned', ARRAY['location_lookup'], 1, 'Free and open source', 'No known limit', NULL),
  (cat_loc, 'API Alamat Indonesia', 'api-alamat', 'Komunitas', 'https://github.com/emsifa/api-wilayah-indonesia', 'https://emsifa.github.io/api-wilayah-indonesia', 'none', FALSE, FALSE, TRUE, 'planned', ARRAY['location_lookup'], 2, 'Free, open source', 'Static JSON', NULL),
  (cat_loc, 'Kode Pos API', 'kodepos-api', 'Komunitas', 'https://github.com/saperliu/kodepos-indonesia', 'https://kodepos.vercel.app', 'none', FALSE, FALSE, TRUE, 'planned', ARRAY['location_lookup'], 2, 'Free', 'No known limit', NULL),
  (cat_loc, 'Places API Indonesia', 'places-api-id', 'Various', NULL, NULL, 'api_key', TRUE, FALSE, TRUE, 'planned', ARRAY['location_lookup'], 3, 'Varies by provider', 'Varies', 'Multiple providers available'),
  (cat_soc, 'Twitter/X Trends API', 'twitter-trends', 'X Corp', 'https://developer.twitter.com', 'https://api.twitter.com/2', 'oauth2', TRUE, TRUE, FALSE, 'planned', ARRAY['trending_product_discovery'], 2, 'Free tier very limited', '1500 tweets/month free', NULL),
  (cat_soc, 'YouTube Data API', 'youtube-api', 'Google', 'https://developers.google.com/youtube', 'https://www.googleapis.com/youtube/v3', 'api_key', TRUE, TRUE, FALSE, 'planned', ARRAY['trending_product_discovery','product_review_discovery'], 2, 'Free 10000 quota/day', '10000 units/day', NULL),
  (cat_soc, 'WhatsApp Official API', 'whatsapp-official', 'Meta', 'https://developers.facebook.com/docs/whatsapp', 'https://graph.facebook.com/v18.0', 'bearer_token', TRUE, TRUE, FALSE, 'planned', ARRAY['messaging','price_alert_notification'], 1, 'Conversation-based pricing', 'Varies by tier', NULL),
  (cat_soc, 'WhatsApp Cloud API Wrapper', 'whatsapp-cloud', 'Community', 'https://github.com/nicehash/whatsapp-cloud-api', 'https://graph.facebook.com/v18.0', 'bearer_token', TRUE, FALSE, TRUE, 'planned', ARRAY['messaging','price_alert_notification'], 3, 'Same as WhatsApp Official', 'Same as Official', 'Unofficial wrapper, use with caution'),
  (cat_util, 'Google Trends API', 'google-trends', 'Google (Unofficial)', 'https://github.com/nicedoc/google-trends-api', NULL, 'none', FALSE, FALSE, TRUE, 'planned', ARRAY['trending_product_discovery','analytics'], 2, 'Free, unofficial', 'Rate limited, may be blocked', 'Scraping-based, may break'),
  (cat_util, 'Screenshot API', 'screenshot-api', 'Various', NULL, NULL, 'api_key', TRUE, FALSE, TRUE, 'planned', ARRAY['screenshot_capture'], 3, 'Varies by provider', 'Varies', 'Options: ScreenshotAPI, ApiFlash, etc.'),
  (cat_util, 'SMSNotif', 'sms-notif', 'SMSNotif', 'https://smsnotif.id', 'https://api.smsnotif.id', 'api_key', TRUE, TRUE, FALSE, 'planned', ARRAY['sms_notification','price_alert_notification'], 2, 'Pay per SMS', 'Varies', NULL),
  (cat_util, 'Translasi API', 'translasi-api', 'Various', NULL, NULL, 'api_key', TRUE, FALSE, TRUE, 'planned', ARRAY['translation'], 3, 'Varies', 'Varies', 'Options: Google Translate, DeepL, LibreTranslate'),
  (cat_util, 'APIMock', 'apimock', 'Community', 'https://apimock.dev', 'https://api.apimock.dev', 'none', FALSE, FALSE, TRUE, 'planned', ARRAY['mocking'], 4, 'Free', 'No known limit', 'For development/testing only'),
  (cat_pay, 'Midtrans', 'midtrans', 'Midtrans', 'https://docs.midtrans.com', 'https://api.midtrans.com/v2', 'basic_auth', TRUE, TRUE, FALSE, 'planned', ARRAY['payment'], 1, 'Transaction fee 1.7%-4%', 'No known limit', NULL),
  (cat_pay, 'Xendit', 'xendit', 'Xendit', 'https://developers.xendit.co', 'https://api.xendit.co', 'api_key', TRUE, TRUE, FALSE, 'planned', ARRAY['payment'], 1, 'Transaction fee varies', 'Standard rate limit', NULL),
  (cat_pay, 'Duitku', 'duitku', 'Duitku', 'https://docs.duitku.com', 'https://passport.duitku.com/webapi/api', 'signature', TRUE, TRUE, FALSE, 'planned', ARRAY['payment'], 2, 'Transaction fee varies', 'Standard rate limit', NULL),
  (cat_pay, 'Tripay', 'tripay', 'Tripay', 'https://tripay.co.id/api', 'https://api.tripay.co.id', 'api_key', TRUE, TRUE, FALSE, 'planned', ARRAY['payment'], 2, 'Transaction fee 0.7%-1.5%', 'Standard rate limit', NULL),
  (cat_pay, 'DOKU', 'doku', 'DOKU', 'https://developer.doku.com', 'https://api.doku.com', 'oauth2', TRUE, TRUE, FALSE, 'planned', ARRAY['payment'], 2, 'Transaction fee varies', 'Standard rate limit', NULL)
  ON CONFLICT (slug) DO NOTHING;
END $$;