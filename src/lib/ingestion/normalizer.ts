/**
 * Data Normalizer for BijakBeli.app
 * 
 * Handles various Indonesian data formats from different sources:
 * - Price formats: "Rp 1.299.000", "1,299,000", "Rp1.299.000"
 * - Stock status: "Tersedia", "Stok habis", "Stok terbatas"
 * - Marketplace names: variations and domains
 * - Conditions: "Baru", "Bekas", "Refurbished"
 * 
 * All normalizers are defensive and return safe defaults on errors.
 */

import type { OfferCondition, StockStatus } from "@/lib/supabase/offers";

// ============================================================================
// PRICE NORMALIZATION
// ============================================================================

/**
 * Normalize Indonesian price formats to number
 * 
 * Handles:
 * - "Rp 1.299.000" → 1299000
 * - "Rp1.299.000" → 1299000
 * - "1.299.000" → 1299000
 * - "1,299,000" → 1299000
 * - "1299000" → 1299000
 * - 1299000 → 1299000
 * - "1.2 juta" → 1200000
 * - "1,2 jt" → 1200000
 * - "500 rb" → 500000
 * - "500k" → 500000
 * - "2.5 juta" → 2500000
 * 
 * @param raw - Raw price input (string or number)
 * @returns Normalized price as integer, or 0 if invalid
 */
export function normalizePrice(raw: string | number | null | undefined): number {
  if (raw === null || raw === undefined) return 0;
  
  // If already a number, return it
  if (typeof raw === "number") {
    return Math.round(Math.max(0, raw));
  }
  
  // Convert to string and clean
  let cleaned = String(raw)
    .trim()
    .toUpperCase()
    .replace(/RP\.?/g, "") // Remove "Rp" or "Rp."
    .replace(/IDR/g, "");   // Remove "IDR"
  
  // Handle Indonesian shorthand formats
  // "1.2 juta" or "1,2 juta" → 1200000
  const jutaMatch = cleaned.match(/([\d.,]+)\s*(JUTA|JT)/);
  if (jutaMatch) {
    const baseNum = parseFloat(jutaMatch[1].replace(/\./g, "").replace(/,/g, "."));
    return isNaN(baseNum) ? 0 : Math.round(baseNum * 1000000);
  }
  
  // "500 rb" or "500 ribu" → 500000
  const ribuMatch = cleaned.match(/([\d.,]+)\s*(RB|RIBU)/);
  if (ribuMatch) {
    const baseNum = parseFloat(ribuMatch[1].replace(/\./g, "").replace(/,/g, "."));
    return isNaN(baseNum) ? 0 : Math.round(baseNum * 1000);
  }
  
  // "500k" or "500K" → 500000
  const kMatch = cleaned.match(/([\d.,]+)\s*K$/);
  if (kMatch) {
    const baseNum = parseFloat(kMatch[1].replace(/\./g, "").replace(/,/g, "."));
    return isNaN(baseNum) ? 0 : Math.round(baseNum * 1000);
  }
  
  // Standard number format
  cleaned = cleaned
    .replace(/\s+/g, "")     // Remove all spaces
    .replace(/\./g, "")      // Remove dots (thousand separator in ID)
    .replace(/,/g, "");      // Remove commas
  
  // Extract first number sequence
  const match = cleaned.match(/\d+/);
  if (!match) return 0;
  
  const parsed = parseInt(match[0], 10);
  return isNaN(parsed) ? 0 : Math.max(0, parsed);
}

/**
 * Calculate discount percentage from current and original price
 * 
 * @param currentPrice - Current/sale price
 * @param originalPrice - Original/list price
 * @returns Discount percentage (0-100), or null if no discount
 */
export function calculateDiscountPercent(
  currentPrice: number,
  originalPrice: number | null | undefined
): number | null {
  if (!originalPrice || originalPrice <= 0) return null;
  if (currentPrice <= 0) return null;
  if (currentPrice >= originalPrice) return null;
  
  const discount = ((originalPrice - currentPrice) / originalPrice) * 100;
  return Math.round(discount * 100) / 100; // Round to 2 decimals
}

// ============================================================================
// MARKETPLACE NORMALIZATION
// ============================================================================

/**
 * Normalize marketplace name/URL to standard identifier
 * 
 * @param raw - Raw marketplace input (name, URL, or domain)
 * @returns Normalized marketplace slug
 */
export function normalizeMarketplace(raw: string | null | undefined): string {
  if (!raw) return "unknown";
  
  const cleaned = raw.toLowerCase().trim();
  
  // Match common marketplace patterns
  if (cleaned.includes("tokopedia")) return "tokopedia";
  if (cleaned.includes("shopee")) return "shopee";
  if (cleaned.includes("lazada")) return "lazada";
  if (cleaned.includes("blibli")) return "blibli";
  if (cleaned.includes("bukalapak")) return "bukalapak";
  if (cleaned.includes("jd.id") || cleaned.includes("jd id")) return "jd.id";
  if (cleaned.includes("zalora")) return "zalora";
  if (cleaned.includes("bhinneka")) return "bhinneka";
  
  return cleaned.replace(/[^a-z0-9]/g, "") || "unknown";
}

// ============================================================================
// STOCK STATUS NORMALIZATION
// ============================================================================

/**
 * Normalize Indonesian stock status to standard enum
 * 
 * @param raw - Raw stock status text
 * @returns Normalized stock status
 */
export function normalizeStockStatus(raw: string | null | undefined): StockStatus {
  if (!raw) return "unknown";
  
  const cleaned = raw.toLowerCase().trim();
  
  // In stock patterns
  if (
    cleaned.includes("tersedia") ||
    cleaned.includes("ready") ||
    cleaned.includes("in stock") ||
    cleaned.includes("ada") ||
    cleaned.includes("siap kirim")
  ) {
    return "in_stock";
  }
  
  // Low stock patterns
  if (
    cleaned.includes("terbatas") ||
    cleaned.includes("sisa") ||
    cleaned.includes("low stock") ||
    cleaned.includes("hampir habis")
  ) {
    return "low_stock";
  }
  
  // Out of stock patterns (FIXED: removed pre-order from here)
  if (
    cleaned.includes("habis") ||
    cleaned.includes("kosong") ||
    cleaned.includes("out of stock") ||
    cleaned.includes("tidak tersedia") ||
    cleaned.includes("sold out")
  ) {
    return "out_of_stock";
  }
  
  // Pre-order is NOT out_of_stock - it's available for order
  // Map to in_stock since schema doesn't have pre_order status
  if (
    cleaned.includes("pre") && cleaned.includes("order") ||
    cleaned.includes("preorder") ||
    cleaned.includes("po")
  ) {
    return "in_stock"; // Pre-order means available, not out of stock
  }
  
  return "unknown";
}

// ============================================================================
// CONDITION NORMALIZATION
// ============================================================================

/**
 * Normalize product condition to standard enum
 * 
 * @param raw - Raw condition text
 * @returns Normalized condition
 */
export function normalizeCondition(raw: string | null | undefined): OfferCondition {
  if (!raw) return "unknown"; // Changed: default to unknown, not new
  
  const cleaned = raw.toLowerCase().trim();
  
  // New patterns (explicit signals only)
  if (
    cleaned.includes("baru") ||
    cleaned.includes("new") ||
    cleaned.includes("bnib") ||
    cleaned.includes("brand new")
  ) {
    return "new";
  }
  
  // Used/second patterns
  if (
    cleaned.includes("bekas") ||
    cleaned.includes("second") ||
    cleaned.includes("seken") ||
    cleaned.includes("used") ||
    cleaned.includes("pre-owned") ||
    cleaned.includes("preloved")
  ) {
    return "used";
  }
  
  // Refurbished patterns
  if (
    cleaned.includes("refurbished") ||
    cleaned.includes("rekondisi") ||
    cleaned.includes("refurb")
  ) {
    return "refurbished";
  }
  
  // If no clear signal, return unknown
  return "unknown";
}

// ============================================================================
// PRODUCT TITLE NORMALIZATION
// ============================================================================

/**
 * Normalize product title for matching and search
 * 
 * @param raw - Raw product title
 * @returns Normalized title
 */
export function normalizeProductTitle(raw: string | null | undefined): string {
  if (!raw) return "";
  
  return raw
    .trim()
    .replace(/\s+/g, " ")           // Normalize spaces
    .replace(/[^\w\s-]/g, "")       // Remove special chars except hyphen
    .toLowerCase();
}

// ============================================================================
// MASTER OFFER NORMALIZER
// ============================================================================

export interface RawOfferInput {
  marketplace?: string;
  product_url: string;
  marketplace_product_id?: string;
  title?: string;
  price: string | number;
  original_price?: string | number | null;
  seller_name?: string;
  seller_id?: string;
  seller_rating?: string | number | null;
  seller_location?: string;
  is_official_store?: boolean | string;
  condition?: string;
  variant?: string;
  stock_status?: string;
  rating?: string | number | null;
  review_count?: string | number | null;
  sold_count?: string | number | null;
  shipping_estimate?: string | number | null;
  voucher_text?: string;
  location?: string;
  source: string;
  captured_at?: string | Date;
}

export interface NormalizedOffer {
  marketplace: string;
  product_url: string;
  marketplace_product_id: string | null;
  title: string;
  current_price: number;
  original_price: number | null;
  discount_percent: number | null;
  seller_name: string | null;
  seller_id: string | null;
  seller_rating: number | null;
  seller_location: string | null;
  is_official_store: boolean;
  condition: OfferCondition;
  variant: string | null;
  stock_status: StockStatus;
  rating: number | null;
  review_count: number | null;
  sold_count: number | null;
  shipping_estimate: number | null;
  voucher_text: string | null;
  location: string | null;
  source: string;
  captured_at: Date;
}

/**
 * Master normalizer that processes raw offer input into normalized format
 * 
 * This is the main entry point for all data ingestion.
 * Applies all normalization rules and returns clean, typed data.
 * 
 * @param raw - Raw offer input from any source
 * @returns Normalized offer ready for database insertion
 */
export function normalizeOffer(raw: RawOfferInput): NormalizedOffer {
  const currentPrice = normalizePrice(raw.price);
  const originalPrice = raw.original_price ? normalizePrice(raw.original_price) : null;
  
  return {
    marketplace: normalizeMarketplace(raw.marketplace),
    product_url: raw.product_url.trim(),
    marketplace_product_id: raw.marketplace_product_id?.trim() || null,
    title: normalizeProductTitle(raw.title),
    current_price: currentPrice,
    original_price: originalPrice,
    discount_percent: calculateDiscountPercent(currentPrice, originalPrice),
    seller_name: raw.seller_name?.trim() || null,
    seller_id: raw.seller_id?.trim() || null,
    seller_rating: normalizeRating(raw.seller_rating),
    seller_location: raw.seller_location?.trim() || raw.location?.trim() || null,
    is_official_store: normalizeBoolean(raw.is_official_store),
    condition: normalizeCondition(raw.condition),
    variant: raw.variant?.trim() || null,
    stock_status: normalizeStockStatus(raw.stock_status),
    rating: normalizeRating(raw.rating),
    review_count: normalizeCount(raw.review_count),
    sold_count: normalizeCount(raw.sold_count),
    shipping_estimate: normalizePrice(raw.shipping_estimate),
    voucher_text: raw.voucher_text?.trim() || null,
    location: raw.seller_location?.trim() || raw.location?.trim() || null,
    source: raw.source.trim(),
    captured_at: raw.captured_at ? new Date(raw.captured_at) : new Date(),
  };
}

// ============================================================================
// HELPER NORMALIZERS
// ============================================================================

function normalizeRating(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  
  const num = typeof raw === "number" ? raw : parseFloat(String(raw));
  if (isNaN(num)) return null;
  
  // Clamp to 0-5 range
  return Math.max(0, Math.min(5, num));
}

function normalizeCount(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  
  const cleaned = String(raw).replace(/[^\d]/g, "");
  const num = parseInt(cleaned, 10);
  
  return isNaN(num) ? null : Math.max(0, num);
}

function normalizeBoolean(raw: boolean | string | null | undefined): boolean {
  if (typeof raw === "boolean") return raw;
  if (!raw) return false;
  
  const cleaned = String(raw).toLowerCase().trim();
  return cleaned === "true" || cleaned === "1" || cleaned === "yes" || cleaned === "ya";
}

// ============================================================================
// HASH GENERATION (for deduplication)
// ============================================================================

/**
 * Generate a hash for raw offer data to detect duplicates
 * 
 * @param offer - Normalized offer
 * @returns Hash string for deduplication
 */
export function generateOfferHash(offer: NormalizedOffer): string {
  const hashInput = [
    offer.marketplace,
    offer.marketplace_product_id || offer.product_url,
    offer.current_price,
    offer.seller_name,
    offer.captured_at.toISOString().split("T")[0], // Date only
  ].join("|");
  
  // Simple hash (for production, consider crypto.createHash)
  return Buffer.from(hashInput).toString("base64");
}
