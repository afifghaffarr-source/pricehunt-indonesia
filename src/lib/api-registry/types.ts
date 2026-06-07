export type ApiSourceStatus = 'planned' | 'testing' | 'active' | 'limited' | 'deprecated' | 'failed';

export type ApiSourceCategorySlug =
  | 'e-commerce'
  | 'jasa-pengiriman'
  | 'lokasi'
  | 'sosial-media'
  | 'utilitas'
  | 'payment';

export type ApiAuthType =
  | 'api_key'
  | 'oauth2'
  | 'bearer_token'
  | 'basic_auth'
  | 'none'
  | 'signature'
  | 'custom_header';

export type ApiUseCase =
  | 'product_search'
  | 'product_detail'
  | 'price_sync'
  | 'seller_info'
  | 'shipping_estimate'
  | 'tracking'
  | 'location_lookup'
  | 'price_alert_notification'
  | 'trending_product_discovery'
  | 'product_review_discovery'
  | 'payment'
  | 'screenshot_capture'
  | 'translation'
  | 'mocking'
  | 'messaging'
  | 'sms_notification'
  | 'analytics';

export interface ApiSourceCategory {
  id: string;
  name: string;
  slug: ApiSourceCategorySlug;
  description: string | null;
  created_at: string;
}

export interface ApiSource {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  provider: string | null;
  documentation_url: string | null;
  base_url: string | null;
  auth_type: ApiAuthType;
  requires_api_key: boolean;
  is_official: boolean;
  is_unofficial: boolean;
  status: ApiSourceStatus;
  use_case: ApiUseCase[];
  priority: number;
  pricing_note: string | null;
  rate_limit_note: string | null;
  risk_note: string | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiSourceWithCategory extends ApiSource {
  category: ApiSourceCategory;
}

export interface ApiSourceCredential {
  id: string;
  api_source_id: string;
  credential_name: string;
  env_key_name: string;
  is_configured: boolean;
  last_validated_at: string | null;
  created_at: string;
}

export interface ApiSourceUsageLog {
  id: string;
  api_source_id: string;
  endpoint: string | null;
  method: string | null;
  status_code: number | null;
  success: boolean;
  error_message: string | null;
  duration_ms: number | null;
  requested_at: string;
}

export interface ApiSourceHealthCheck {
  id: string;
  api_source_id: string;
  status: string;
  response_time_ms: number | null;
  message: string | null;
  checked_at: string;
}

export const PRIORITY_LABELS: Record<number, string> = {
  1: 'Sangat Penting',
  2: 'Penting',
  3: 'Opsional',
  4: 'Eksperimen',
};

export const STATUS_LABELS: Record<ApiSourceStatus, string> = {
  planned: 'Direncanakan',
  testing: 'Testing',
  active: 'Aktif',
  limited: 'Terbatas',
  deprecated: 'Deprecated',
  failed: 'Gagal',
};

export const CATEGORY_LABELS: Record<ApiSourceCategorySlug, string> = {
  'e-commerce': 'E-Commerce',
  'jasa-pengiriman': 'Jasa Pengiriman',
  lokasi: 'Lokasi',
  'sosial-media': 'Sosial Media',
  utilitas: 'Utilitas',
  payment: 'Payment',
};

export const USE_CASE_LABELS: Record<ApiUseCase, string> = {
  product_search: 'Pencarian Produk',
  product_detail: 'Detail Produk',
  price_sync: 'Sinkronisasi Harga',
  seller_info: 'Info Seller',
  shipping_estimate: 'Estimasi Pengiriman',
  tracking: 'Pelacakan Paket',
  location_lookup: 'Cari Lokasi',
  price_alert_notification: 'Notifikasi Harga',
  trending_product_discovery: 'Produk Trending',
  product_review_discovery: 'Review Produk',
  payment: 'Pembayaran',
  screenshot_capture: 'Screenshot',
  translation: 'Terjemahan',
  mocking: 'Mock/Testing',
  messaging: 'Pesan/Messaging',
  sms_notification: 'SMS Notifikasi',
  analytics: 'Analytics',
};
