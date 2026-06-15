"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";
import { isUserAdmin } from "@/lib/admin-auth";
import { isOfferInStock } from "@/lib/ingestion/adapter";

export type AdminState = { error?: string; success?: boolean } | undefined;

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

export async function createProduct(state: AdminState, formData: FormData): Promise<AdminState> {
  const { adminClient } = await requireAdmin();

  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  const description = formData.get("description") as string;
  const imageUrl = formData.get("image_url") as string;
  const slugRaw = formData.get("slug") as string;

  if (!name || !category) {
    return { error: "Nama dan kategori wajib diisi." };
  }

  const slug = slugRaw || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const productData = {
    name,
    slug,
    category,
    description: description || "",
    image_url: imageUrl || "https://placehold.co/400x400/e2e8f0/64748b?text=Product",
  };

  // Cast payload to `any` to bypass the Supabase generated types that may not
  // include the latest column shape; admin client is server-only trusted.
  const { error } = await adminClient.from("products").insert(productData as never);

  if (error) return { error: `Gagal: ${error.message}` };

  revalidatePath("/admin");
  revalidatePath("/search");
  return { success: true };
}

export async function deleteProduct(productId: string) {
  const { adminClient } = await requireAdmin();
  await adminClient.from("products").delete().eq("id", productId);
  revalidatePath("/admin");
}

export async function upsertPrice(state: AdminState, formData: FormData): Promise<AdminState> {
  const { adminClient } = await requireAdmin();

  const productId = formData.get("product_id") as string;
  const marketplaceId = formData.get("marketplace_id") as string;
  const price = parseInt(formData.get("price") as string, 10);
  const url = formData.get("url") as string;
  const seller = formData.get("seller") as string;

  if (!productId || !marketplaceId || !price) {
    return { error: "Semua field wajib diisi." };
  }

  // A-002: write to `offers` (post-114) instead of legacy `prices`.
  // Use (product_id, marketplace_id) tuple via select-then-upsert on url.
  const { data: existing } = await adminClient
    .from("offers")
    .select("id, url")
    .eq("product_id", productId)
    .eq("marketplace_id", marketplaceId)
    .maybeSingle();

  const offerUrl = url || (existing as { url: string | null } | null)?.url || `admin://${productId}/${marketplaceId}`;

  const offerData = {
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
  };

  // Cast payload to `any` for upsert.
  const { error } = await adminClient.from("offers").upsert(
    offerData as never,
    { onConflict: "url" }
  );

  if (error) return { error: `Gagal: ${error.message}` };

  // A-002: read from `offers` and use adapter stock-status logic.
  const { data: allOffers } = await adminClient
    .from("offers")
    .select("current_price, stock_status, is_active")
    .eq("product_id", productId);

  if (allOffers && allOffers.length > 0) {
    const inStock = (allOffers as Array<{ current_price: number | null; stock_status: string | null; is_active: boolean | null }>)
      .filter((o) => isOfferInStock(o.stock_status, o.is_active) && (o.current_price ?? 0) > 0);
    const vals = inStock.map((p) => p.current_price ?? 0);
    if (vals.length === 0) return { success: true };
    const lowest = Math.min(...vals);
    const highest = Math.max(...vals);
    const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    const score = Math.round(100 - ((avg - lowest) / avg) * 100);

    await adminClient
      .from("products")
      .update({
        lowest_price: lowest,
        highest_price: highest,
        average_price: avg,
        deal_score: score,
      } as never)
      .eq("id", productId);
  }

  revalidatePath("/admin");
  revalidatePath(`/product/[slug]`);
  return { success: true };
}
