"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";
import { isUserAdmin } from "@/lib/admin-auth";
import { isOfferInStock } from "@/lib/ingestion/adapter";

async function requireAdmin() {
  const user = await getUser();
  if (!user) redirect("/auth/login");

  // Secure admin check — reads from admin_users (RLS-protected).
  // Does NOT trust `user_profiles.preferences.is_admin`.
  const isAdmin = await isUserAdmin(user.id);
  if (!isAdmin) redirect("/dashboard?error=forbidden");

  // Only after admin check passes do we instantiate the service-role client.
  return { user, adminClient: createAdminClient() };
}

export async function updateProduct(productId: string, formData: FormData) {
  const { adminClient } = await requireAdmin();

  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  const imageUrl = formData.get("image_url") as string;
  const description = formData.get("description") as string;
  const aiVerdict = formData.get("ai_verdict") as string;

  if (!name || !category) {
    return { error: "Nama dan kategori wajib diisi." };
  }

  const update = {
    name,
    category,
    description: description || null,
    image_url: imageUrl || null,
    ai_verdict: aiVerdict || null,
  };

  const { error } = await adminClient
    .from("products")
    .update(update as never)
    .eq("id", productId);

  if (error) return { error: error.message };

  revalidatePath("/admin");
  revalidatePath("/search");
  return { success: true };
}

export async function deleteProduct(productId: string) {
  const { adminClient } = await requireAdmin();

  const { error } = await adminClient.from("products").delete().eq("id", productId);
  if (error) return { error: error.message };

  revalidatePath("/admin");
  revalidatePath("/search");
  return { success: true };
}

// A-002: write to `offers` (post-114) instead of legacy `prices`. The
// new table's unique index is on `url`, not (product_id, marketplace_id),
// so we look up the existing offer's url first, falling back to a
// synthetic admin:// URL for the (product, marketplace) tuple.
export async function upsertPrice(formData: FormData) {
  const { adminClient } = await requireAdmin();

  const productId = formData.get("product_id") as string;
  const marketplaceId = formData.get("marketplace_id") as string;
  const price = parseInt(formData.get("price") as string, 10);
  const url = formData.get("url") as string;
  const seller = formData.get("seller") as string;

  if (!productId || !marketplaceId || !price) {
    return { error: "product_id, marketplace_id, dan price wajib diisi." };
  }

  const { data: existing } = await adminClient
    .from("offers")
    .select("id, url")
    .eq("product_id", productId)
    .eq("marketplace_id", marketplaceId)
    .maybeSingle();

  const offerUrl =
    url ||
    (existing as { url: string | null } | null)?.url ||
    `admin://${productId}/${marketplaceId}`;

  const offerUpsert = {
    product_id: productId,
    marketplace_id: marketplaceId,
    current_price: price,
    url: offerUrl,
    seller_name: seller || null,
    stock_status: "in_stock",
    is_active: true,
    source: "manual_admin",
    last_checked_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as never;

  const { error } = await adminClient
    .from("offers")
    .upsert(offerUpsert, { onConflict: "url" });

  if (error) return { error: error.message };

  await recalculateProductStats(adminClient, productId);

  revalidatePath("/admin");
  revalidatePath("/search");
  return { success: true };
}

async function recalculateProductStats(
  supabase: ReturnType<typeof createAdminClient>,
  productId: string
) {
  // A-002: read from `offers` and use the adapter's stock-status logic
  // to filter to in-stock offers (consistent with public read routes).
  const { data: offers } = await supabase
    .from("offers")
    .select("current_price, stock_status, is_active")
    .eq("product_id", productId);

  if (!offers || offers.length === 0) return;

  const inStock = (offers as Array<{ current_price: number | null; stock_status: string | null; is_active: boolean | null }>)
    .filter((o) => isOfferInStock(o.stock_status, o.is_active) && (o.current_price ?? 0) > 0);
  const priceValues = inStock.map((p) => p.current_price ?? 0);

  if (priceValues.length === 0) return;

  const lowest = Math.min(...priceValues);
  const highest = Math.max(...priceValues);
  const average = Math.round(priceValues.reduce((a, b) => a + b, 0) / priceValues.length);
  const dealScore = Math.round(100 - ((average - lowest) / average) * 100);

  await supabase
    .from("products")
    .update({
      lowest_price: lowest,
      highest_price: highest,
      average_price: average,
      deal_score: dealScore,
    } as never)
    .eq("id", productId);
}
