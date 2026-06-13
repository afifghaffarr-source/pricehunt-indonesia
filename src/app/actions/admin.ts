"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";
import { isUserAdmin } from "@/lib/admin-auth";

async function requireAdmin() {
  const user = await getUser();
  if (!user) redirect("/auth/login");

  // Secure admin check — reads from admin_users (RLS-protected).
  // Does NOT trust `user_profiles.preferences.is_admin`.
  const isAdmin = await isUserAdmin(user.id);
  if (!isAdmin) redirect("/dashboard?error=forbidden");

  return { user, adminClient: createAdminClient() };
}

export async function createProduct(formData: FormData) {
  const { adminClient } = await requireAdmin();

  const name = formData.get("name") as string;
  const slug = (formData.get("slug") as string) || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const category = formData.get("category") as string;
  const description = formData.get("description") as string;
  const imageUrl = formData.get("image_url") as string;

  const productInsert = {
    name,
    slug,
    category,
    description,
    image_url: imageUrl || "https://placehold.co/400x400/e2e8f0/64748b?text=Product",
    lowest_price: 0,
    highest_price: 0,
    average_price: 0,
    deal_score: 0,
  } as never;

  const { error } = await adminClient.from("products").insert(productInsert);

  if (error) return { error: error.message };

  revalidatePath("/admin");
  revalidatePath("/search");
  return { success: true };
}

export async function updateProduct(productId: string, formData: FormData) {
  const { adminClient } = await requireAdmin();

  const updates: Record<string, unknown> = {};
  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  const description = formData.get("description") as string;
  const imageUrl = formData.get("image_url") as string;
  const aiVerdict = formData.get("ai_verdict") as string;

  if (name) updates.name = name;
  if (category) updates.category = category;
  if (description) updates.description = description;
  if (imageUrl) updates.image_url = imageUrl;
  if (aiVerdict !== null) updates.ai_verdict = aiVerdict;

  const { error } = await adminClient
    .from("products")
    .update(updates as never)
    .eq("id", productId);

  if (error) return { error: error.message };

  revalidatePath("/admin");
  revalidatePath(`/product/${formData.get("slug") || ""}`);
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

  const priceUpsert = {
      product_id: productId,
      marketplace_id: marketplaceId,
      price,
      url,
      seller,
      in_stock: true,
      shipping_cost: 0,
      last_updated: new Date().toISOString(),
  } as never;

  const { error } = await adminClient.from("prices").upsert(
    priceUpsert,
    { onConflict: "product_id,marketplace_id" }
  );

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
  const { data: prices } = await supabase
    .from("prices")
    .select("price")
    .eq("product_id", productId)
    .eq("in_stock", true);

  if (!prices || prices.length === 0) return;

  const priceValues = (prices as Array<{ price: number }>).map((p) => p.price);
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
