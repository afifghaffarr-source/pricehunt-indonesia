/**
 * Offers & Price Snapshots Data Model
 *
 * Source of truth: `Database` type in `./types` (auto-generated from Supabase
 * via `supabase gen types typescript`). Re-export the row shapes here with
 * narrower enum unions for app-level safety.
 *
 * Migration source-of-truth: supabase/migrations/107_normalize_prices_to_offers.sql,
 * 108_price_snapshots.sql, 124_offers_additive_migration.sql.
 */

import { createClient } from "./client";
import { createAdminClient } from "./admin";
import type { Database } from "./types";

export type OfferRow = Database["public"]["Tables"]["offers"]["Row"];
export type OfferInsert = Database["public"]["Tables"]["offers"]["Insert"];
export type OfferUpdate = Database["public"]["Tables"]["offers"]["Update"];

export type PriceSnapshotRow = Database["public"]["Tables"]["price_snapshots"]["Row"];
export type PriceSnapshotInsert = Database["public"]["Tables"]["price_snapshots"]["Insert"];

export type OfferCondition = "new" | "used" | "refurbished" | "unknown";
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock" | "unknown";

/**
 * Legacy `Offer` shape preserved for app code that still uses it.
 * Subset of generated `OfferRow` with `title` widened to required (was nullable
 * in 124 — adapter ensures it's always present at write time).
 */
export interface Offer extends Omit<OfferRow, "title"> {
  title: string; // narrowed: always required at the app layer
}

/**
 * Legacy `PriceSnapshot` shape preserved for app code. Maps generated
 * `PriceSnapshotRow` field-for-field.
 */
export interface PriceSnapshot extends PriceSnapshotRow {}

export interface OfferWithMarketplace extends Offer {
  marketplace: {
    id: string;
    name: string;
    logo_url: string | null;
  };
}

export interface OfferWithSnapshots extends Offer {
  snapshots: PriceSnapshot[];
}

// ============================================================================
// PUBLIC DATA ACCESS (using anon key)
// ============================================================================

/**
 * Get all offers for a product
 */
export async function getOffersByProduct(productId: string): Promise<OfferWithMarketplace[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("offers")
    .select(`
      *,
      marketplace:marketplaces(id, name, logo_url)
    `)
    .eq("product_id", productId)
    .order("current_price", { ascending: true });

  if (error) {
    console.error("Error fetching offers:", error);
    return [];
  }

  return (data as OfferWithMarketplace[]) || [];
}

/**
 * Get price history for an offer
 */
export async function getPriceSnapshotsByOffer(
  offerId: string,
  limit: number = 90
): Promise<PriceSnapshot[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("price_snapshots")
    .select("*")
    .eq("offer_id", offerId)
    .order("captured_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching price snapshots:", error);
    return [];
  }

  return data || [];
}

/**
 * Get best offer (lowest current price from official stores, or lowest overall)
 */
export async function getBestOffer(productId: string): Promise<Offer | null> {
  const supabase = createClient();
  
  // Try official stores first
  const { data: officialData } = await supabase
    .from("offers")
    .select("*")
    .eq("product_id", productId)
    .eq("is_official_store", true)
    .eq("stock_status", "in_stock")
    .order("current_price", { ascending: true })
    .limit(1)
    .single();

  if (officialData) {
    return officialData;
  }

  // Fallback to any store
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("product_id", productId)
    .eq("stock_status", "in_stock")
    .order("current_price", { ascending: true })
    .limit(1)
    .single();

  if (error) {
    return null;
  }

  return data;
}

// ============================================================================
// ADMIN DATA ACCESS (using service role)
// ============================================================================

/**
 * Create or update an offer (upsert)
 * Admin/cron only
 * 
 * NOTE: Type assertion needed because Supabase types haven't been regenerated
 * after migrations 107/108 which created the offers table.
 * Runtime schema is correct (58 ingestion tests pass).
 * TODO: Regenerate types with `supabase gen types typescript`
 */
export async function upsertOffer(offer: Omit<Offer, "id" | "created_at" | "updated_at">): Promise<Offer | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("offers")
    .upsert({
      ...offer,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "product_id,marketplace_id,marketplace_product_id",
      ignoreDuplicates: false,
    })
    .select()
    .single();

  if (error) {
    console.error("Error upserting offer:", error);
    return null;
  }

  // `data` is OfferRow (title nullable per schema) — adapter/UI ensures
  // title is always populated. Cast to the narrower Offer shape.
  return data as unknown as Offer;
}

/**
 * Create a price snapshot
 * Admin/cron only
 * 
 * NOTE: Type assertion needed - see upsertOffer comment above.
 */
export async function createPriceSnapshot(
  snapshot: Omit<PriceSnapshot, "id" | "captured_at">
): Promise<PriceSnapshot | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("price_snapshots")
    .insert({
      ...snapshot,
      captured_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating price snapshot:", error);
    return null;
  }

  return data;
}

/**
 * Batch update offers from scraping/ingestion
 * Admin/cron only
 * 
 * NOTE: Type assertion needed - see upsertOffer comment above.
 */
export async function batchUpsertOffers(offers: Omit<Offer, "id" | "created_at" | "updated_at">[]): Promise<number> {
  if (offers.length === 0) return 0;

  const supabase = createAdminClient();

  const offersWithTimestamp = offers.map(offer => ({
    ...offer,
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from("offers")
    .upsert(offersWithTimestamp, {
      onConflict: "product_id,marketplace_id,marketplace_product_id",
      ignoreDuplicates: false,
    })
    .select("id");

  if (error) {
    console.error("Error batch upserting offers:", error);
    return 0;
  }

  return data?.length || 0;
}

// ============================================================================
// MIGRATION HELPERS (for future Phase 7 full migration)
// ============================================================================

/**
 * Helper to convert old prices table format to new offers format
 * Use this when migrating data from prices -> offers
 */
export function priceToOffer(
  price: { marketplace_product_id?: string; seller_name?: string; seller_rating?: number; is_official_store?: boolean; url?: string; price?: number; original_price?: number; availability?: string; last_checked?: string },
  productId: string,
  marketplaceId: string
): Omit<Offer, "id" | "created_at" | "updated_at"> {
  return {
    product_id: productId,
    marketplace_id: marketplaceId,
    marketplace_product_id: price.marketplace_product_id || null,
    title: "", // Will be populated from product name
    seller_name: price.seller_name || null,
    seller_id: null,
    seller_rating: price.seller_rating || null,
    seller_review_count: null,
    seller_location: null,
    is_official_store: price.is_official_store || false,
    condition: "new" as OfferCondition,
    variant: null,
    url: price.url || "",
    current_price: price.price || 0,
    original_price: price.original_price || null,
    discount_percentage: null,
    stock_status: price.availability === "in_stock" ? "in_stock" : "unknown",
    shipping_estimate: null,
    shipping_info: null,
    sold_count: null,
    voucher_text: null,
    has_voucher: false,
    has_free_shipping: false,
    image_url: null,
    category_hint: null,
    source: "manual_admin",
    confidence_score: 50,
    confidence_label: "perlu dicek ulang",
    validation_status: "pending",
    is_active: true,
    last_checked_at: price.last_checked || null,
  };
}

/**
 * Check if offers table has data (to determine if migration has run)
 */
export async function hasOffersData(): Promise<boolean> {
  const supabase = createClient();
  
  const { count, error } = await supabase
    .from("offers")
    .select("id", { count: "exact", head: true });

  if (error) {
    return false;
  }

  return (count || 0) > 0;
}

