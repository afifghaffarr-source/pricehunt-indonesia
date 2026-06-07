import { createClient } from "@/lib/supabase/server";

export async function createAdminClient() {
  const { createClient: createSupabaseClient } = await import(
    "@supabase/supabase-js"
  );

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export async function getProducts() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("deal_score", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getProductBySlug(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) return null;
  return data;
}

export async function getProductPrices(productId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prices")
    .select("*, marketplaces(*)")
    .eq("product_id", productId)
    .order("price", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getProductPriceHistory(productId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("price_history")
    .select("*, marketplaces(name)")
    .eq("product_id", productId)
    .order("recorded_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function searchProducts(query: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .or(`name.ilike.%${query}%,category.ilike.%${query}%,description.ilike.%${query}%`)
    .order("deal_score", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getUserWishlist(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wishlists")
    .select("*, products(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getUserAlerts(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("price_alerts")
    .select("*, products(name, slug, image_url, lowest_price)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}
