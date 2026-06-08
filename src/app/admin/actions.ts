"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";

export type AdminState = { error?: string; success?: boolean } | undefined;

async function requireAdmin() {
  const user = await getUser();
  if (!user) redirect("/auth/login");

  // ✅ First verify admin status with regular client
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("preferences")
    .eq("id", user.id)
    .single();

  const prefs = (profile?.preferences as Record<string, unknown>) || {};
  if (!prefs.is_admin) redirect("/dashboard");

  // ✅ After admin verification, return admin client for write operations
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

  /* eslint-disable @typescript-eslint/ban-ts-comment */
  const productData = {
    name,
    slug,
    category,
    description: description || "",
    image_url: imageUrl || "https://placehold.co/400x400/e2e8f0/64748b?text=Product",
  };
  
  // @ts-ignore - Admin client type inference limitation
  const { error } = await adminClient.from("products").insert(productData);
  /* eslint-enable @typescript-eslint/ban-ts-comment */

  if (error) return { error: `Gagal: ${error.message}` };

  revalidatePath("/admin");
  revalidatePath("/search");
  return { success: true };
}

export async function deleteProduct(productId: string) {
  const { adminClient } = await requireAdmin();
  /* eslint-disable @typescript-eslint/ban-ts-comment */
  // @ts-ignore - Admin client type inference limitation
  await adminClient.from("products").delete().eq("id", productId);
  /* eslint-enable @typescript-eslint/ban-ts-comment */
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

  /* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
  const priceData = {
    product_id: productId,
    marketplace_id: marketplaceId,
    price,
    url: url || null,
    seller: seller || null,
    in_stock: true,
    shipping_cost: 0,
    last_updated: new Date().toISOString(),
  } as any;
  
  // @ts-ignore - Admin client type inference limitation
  const { error } = await adminClient.from("prices").upsert(
    priceData,
    { onConflict: "product_id,marketplace_id" }
  );

  if (error) return { error: `Gagal: ${error.message}` };

  // @ts-ignore - Admin client type inference limitation
  const { data: allPrices } = await adminClient
    .from("prices")
    .select("price")
    .eq("product_id", productId)
    .eq("in_stock", true);

  if (allPrices && allPrices.length > 0) {
    // @ts-ignore - Admin client type inference limitation
    const vals = allPrices.map((p) => p.price);
    const lowest = Math.min(...vals);
    const highest = Math.max(...vals);
    const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    const score = Math.round(100 - ((avg - lowest) / avg) * 100);

    // @ts-ignore - Admin client type inference limitation
    await adminClient
      .from("products")
      // @ts-ignore
      .update({
        lowest_price: lowest,
        highest_price: highest,
        average_price: avg,
        deal_score: score,
      })
      .eq("id", productId);
  }
  /* eslint-enable @typescript-eslint/ban-ts-comment */

  revalidatePath("/admin");
  revalidatePath(`/product/[slug]`);
  return { success: true };
}
