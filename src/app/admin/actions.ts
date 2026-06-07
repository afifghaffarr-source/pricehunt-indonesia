"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";

export type AdminState = { error?: string; success?: boolean } | undefined;

async function requireAdmin() {
  const user = await getUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("preferences")
    .eq("id", user.id)
    .single();

  const prefs = (profile?.preferences as Record<string, unknown>) || {};
  if (!prefs.is_admin) redirect("/dashboard");

  return { user, supabase };
}

export async function createProduct(state: AdminState, formData: FormData): Promise<AdminState> {
  const { supabase } = await requireAdmin();

  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  const description = formData.get("description") as string;
  const imageUrl = formData.get("image_url") as string;
  const slugRaw = formData.get("slug") as string;

  if (!name || !category) {
    return { error: "Nama dan kategori wajib diisi." };
  }

  const slug = slugRaw || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const { error } = await supabase.from("products").insert({
    name,
    slug,
    category,
    description: description || "",
    image_url: imageUrl || "https://placehold.co/400x400/e2e8f0/64748b?text=Product",
  });

  if (error) return { error: `Gagal: ${error.message}` };

  revalidatePath("/admin");
  revalidatePath("/search");
  return { success: true };
}

export async function deleteProduct(productId: string) {
  const { supabase } = await requireAdmin();
  await supabase.from("products").delete().eq("id", productId);
  revalidatePath("/admin");
}

export async function upsertPrice(state: AdminState, formData: FormData): Promise<AdminState> {
  const { supabase } = await requireAdmin();

  const productId = formData.get("product_id") as string;
  const marketplaceId = formData.get("marketplace_id") as string;
  const price = parseInt(formData.get("price") as string, 10);
  const url = formData.get("url") as string;
  const seller = formData.get("seller") as string;

  if (!productId || !marketplaceId || !price) {
    return { error: "Semua field wajib diisi." };
  }

  const { error } = await supabase.from("prices").upsert(
    {
      product_id: productId,
      marketplace_id: marketplaceId,
      price,
      url: url || null,
      seller: seller || null,
      in_stock: true,
      shipping_cost: 0,
      last_updated: new Date().toISOString(),
    },
    { onConflict: "product_id,marketplace_id" }
  );

  if (error) return { error: `Gagal: ${error.message}` };

  const { data: allPrices } = await supabase
    .from("prices")
    .select("price")
    .eq("product_id", productId)
    .eq("in_stock", true);

  if (allPrices && allPrices.length > 0) {
    const vals = allPrices.map((p) => p.price);
    const lowest = Math.min(...vals);
    const highest = Math.max(...vals);
    const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    const score = Math.round(100 - ((avg - lowest) / avg) * 100);

    await supabase
      .from("products")
      .update({
        lowest_price: lowest,
        highest_price: highest,
        average_price: avg,
        deal_score: score,
      })
      .eq("id", productId);
  }

  revalidatePath("/admin");
  revalidatePath(`/product/[slug]`);
  return { success: true };
}
