/**
 * User-specific data layer — wishlist + price alerts.
 * Extracted from src/lib/supabase/data.ts during Phase C refactor.
 */
import { createClient, hasSupabaseEnv } from "./client";

/**
 * Get a user's wishlist with embedded product info.
 */
export async function getUserWishlist(userId: string) {
  if (!hasSupabaseEnv()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wishlists")
    .select("id, product_id, created_at, products(id, slug, name, image_url, lowest_price, deal_score)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}

/**
 * Get a user's price alerts with embedded product info.
 */
export async function getUserAlerts(userId: string) {
  if (!hasSupabaseEnv()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("price_alerts")
    .select("id, product_id, target_price, is_active, created_at, products(id, slug, name, image_url, lowest_price)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}

/**
 * Check if a product is in the user's wishlist.
 */
export async function isProductInWishlist(userId: string, productId: string): Promise<boolean> {
  if (!hasSupabaseEnv()) return false;

  const supabase = await createClient();
  const { data } = await supabase
    .from("wishlists")
    .select("id")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .maybeSingle();

  return !!data;
}

/**
 * Get active price alerts for a user + product.
 */
export async function getProductAlerts(userId: string, productId: string) {
  if (!hasSupabaseEnv()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("price_alerts")
    .select("id, target_price, is_active")
    .eq("user_id", userId)
    .eq("product_id", productId);

  return data || [];
}
