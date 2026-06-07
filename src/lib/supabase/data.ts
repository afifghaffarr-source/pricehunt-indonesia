import { createClient } from "@/lib/supabase/server";
import type { Product, MarketplacePrice, PriceHistoryPoint, Marketplace } from "@/lib/types";

function transformProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    category: row.category as string,
    description: (row.description as string) || "",
    imageUrl: (row.image_url as string) || "https://placehold.co/400x400/e2e8f0/64748b?text=Product",
    prices: [],
    priceHistory: [],
    lowestPrice: (row.lowest_price as number) || 0,
    highestPrice: (row.highest_price as number) || 0,
    averagePrice: (row.average_price as number) || 0,
    dealScore: (row.deal_score as number) || 0,
    aiVerdict: (row.ai_verdict as string) || "",
    specs: (row.specs as Record<string, string>) || {},
  };
}

function transformPrices(rows: Record<string, unknown>[]): MarketplacePrice[] {
  return rows.map((row) => {
    const mp = row.marketplaces as Record<string, unknown> | null;
    return {
      marketplace: (mp?.name as Marketplace) || "tokopedia",
      price: row.price as number,
      url: (row.url as string) || "",
      seller: (row.seller as string) || "",
      sellerRating: Number(row.seller_rating) || 0,
      inStock: row.in_stock as boolean,
      shippingCost: (row.shipping_cost as number) || 0,
      lastUpdated: (row.last_updated as string) || new Date().toISOString(),
    };
  });
}

function transformPriceHistory(rows: Record<string, unknown>[]): PriceHistoryPoint[] {
  const byDate: Record<string, PriceHistoryPoint> = {};

  for (const row of rows) {
    const date = (row.recorded_at as string).split("T")[0];
    const mp = row.marketplaces as Record<string, unknown> | null;
    const mpName = (mp?.name as Marketplace) || "tokopedia";

    if (!byDate[date]) {
      byDate[date] = {
        date,
        prices: {} as Record<Marketplace, number | null>,
      };
    }
    byDate[date].prices[mpName] = row.price as number;
  }

  return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
}

export async function getProductsFromDB(): Promise<Product[]> {
  const supabase = await createClient();
  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .order("deal_score", { ascending: false });

  if (error || !products) return [];

  const { data: allPrices } = await supabase
    .from("prices")
    .select("*, marketplaces(name)");

  const pricesByProduct = new Map<string, Record<string, unknown>[]>();
  if (allPrices) {
    for (const p of allPrices) {
      const pid = p.product_id as string;
      if (!pricesByProduct.has(pid)) pricesByProduct.set(pid, []);
      pricesByProduct.get(pid)!.push(p);
    }
  }

  return products.map((p) => {
    const product = transformProduct(p);
    product.prices = transformPrices(pricesByProduct.get(p.id) || []);
    return product;
  });
}

export async function getProductBySlugFromDB(slug: string): Promise<Product | null> {
  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !product) return null;

  const { data: prices } = await supabase
    .from("prices")
    .select("*, marketplaces(name)")
    .eq("product_id", product.id)
    .order("price", { ascending: true });

  const { data: history } = await supabase
    .from("price_history")
    .select("*, marketplaces(name)")
    .eq("product_id", product.id)
    .order("recorded_at", { ascending: true });

  const result = transformProduct(product);
  result.prices = transformPrices(prices || []);
  result.priceHistory = transformPriceHistory(history || []);

  return result;
}

export async function searchProductsFromDB(query: string, category?: string): Promise<Product[]> {
  const supabase = await createClient();

  let queryBuilder = supabase
    .from("products")
    .select("*");

  if (query) {
    queryBuilder = queryBuilder.or(
      `name.ilike.%${query}%,category.ilike.%${query}%,description.ilike.%${query}%`
    );
  }

  if (category) {
    queryBuilder = queryBuilder.eq("category", category);
  }

  queryBuilder = queryBuilder.order("deal_score", { ascending: false });

  const { data: products, error } = await queryBuilder;
  if (error || !products) return [];

  const { data: allPrices } = await supabase
    .from("prices")
    .select("*, marketplaces(name)");

  const pricesByProduct = new Map<string, Record<string, unknown>[]>();
  if (allPrices) {
    for (const p of allPrices) {
      const pid = p.product_id as string;
      if (!pricesByProduct.has(pid)) pricesByProduct.set(pid, []);
      pricesByProduct.get(pid)!.push(p);
    }
  }

  return products.map((p) => {
    const product = transformProduct(p);
    product.prices = transformPrices(pricesByProduct.get(p.id) || []);
    return product;
  });
}

export async function getCategoriesFromDB(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("category")
    .order("category");

  if (!data) return [];
  return [...new Set(data.map((r) => r.category as string))];
}

export async function getUserWishlist(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wishlists")
    .select("id, product_id, created_at, products(id, slug, name, image_url, lowest_price, deal_score)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}

export async function getUserAlerts(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("price_alerts")
    .select("id, product_id, target_price, is_active, created_at, products(id, slug, name, image_url, lowest_price)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}

export async function isProductInWishlist(userId: string, productId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("wishlists")
    .select("id")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .maybeSingle();

  return !!data;
}

export async function getProductAlerts(userId: string, productId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("price_alerts")
    .select("id, target_price, is_active")
    .eq("user_id", userId)
    .eq("product_id", productId);

  return data || [];
}
