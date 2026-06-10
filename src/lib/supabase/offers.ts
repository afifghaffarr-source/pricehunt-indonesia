/**
 * Offers & Price Snapshots Data Model
 * 
 * New normalized schema for multi-seller price tracking.
 * Migration 107 creates these tables.
 * 
 * NOTE: This is foundation for future migration from `prices` table.
 * Current app still uses `prices` - full migration is Phase 7.
 */

import { createClient } from "./client";
import { createAdminClient } from "./admin";

// ============================================================================
// TYPES
// ============================================================================

export type OfferCondition = "new" | "used" | "refurbished" | "unknown";
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock" | "unknown";

export interface Offer {
  id: string;
  product_id: string;
  marketplace_id: string;
  marketplace_product_id: string | null;
  seller_name: string | null;
  seller_rating: number | null;
  is_official_store: boolean;
  condition: OfferCondition;
  variant: string | null;
  url: string;
  current_price: number;
  original_price: number | null;
  stock_status: StockStatus;
  location: string | null;
  shipping_estimate: number | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PriceSnapshot {
  id: string;
  offer_id: string;
  price: number;
  original_price: number | null;
  discount_percent: number | null;
  captured_at: string;
  source: string;
  confidence_score: number | null;
}

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

  // Cast to any because offers table not in generated types yet (migrations 107/108)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("offers") as any)
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

  return data;
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

  // Cast to any because price_snapshots table not in generated types yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("price_snapshots") as any)
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

  // Cast to any because offers table not in generated types yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("offers") as any)
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
    seller_name: price.seller_name || null,
    seller_rating: price.seller_rating || null,
    is_official_store: price.is_official_store || false,
    condition: "new" as OfferCondition,
    variant: null,
    url: price.url || "",
    current_price: price.price || 0,
    original_price: price.original_price || null,
    stock_status: price.availability === "in_stock" ? "in_stock" : "unknown",
    location: null,
    shipping_estimate: null,
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

