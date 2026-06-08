"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const MIN_REASONABLE_ALERT_PRICE = 1_000;
const MAX_REASONABLE_ALERT_PRICE = 1_000_000_000;

export async function toggleWishlist(productId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Anda harus login terlebih dahulu." };
  }

  const { data: existing } = await supabase
    .from("wishlists")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("wishlists")
      .delete()
      .eq("id", existing.id);

    if (error) return { error: "Gagal menghapus wishlist." };
    revalidatePath("/dashboard");
    return { success: true, action: "removed" as const };
  }

  const { error } = await supabase
    .from("wishlists")
    .insert({ user_id: user.id, product_id: productId });

  if (error) return { error: "Gagal menambahkan ke wishlist." };
  revalidatePath("/dashboard");
  return { success: true, action: "added" as const };
}

export async function createPriceAlert(productId: string, targetPrice: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Anda harus login terlebih dahulu." };
  }

  if (!productId || typeof productId !== "string") {
    return { error: "Produk tidak valid." };
  }

  if (!Number.isFinite(targetPrice) || targetPrice <= 0) {
    return { error: "Harga target tidak valid." };
  }

  if (targetPrice < MIN_REASONABLE_ALERT_PRICE) {
    return { error: "Harga target terlalu rendah untuk dipantau." };
  }

  if (targetPrice > MAX_REASONABLE_ALERT_PRICE) {
    return { error: "Harga target terlalu tinggi." };
  }

  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .maybeSingle();

  if (!product) {
    return { error: "Produk tidak ditemukan." };
  }

  // ✅ Return the actual inserted row with real database ID
  const { data, error } = await supabase
    .from("price_alerts")
    .insert({
      user_id: user.id,
      product_id: productId,
      target_price: targetPrice,
    })
    .select()
    .single();

  if (error) return { error: "Gagal membuat price alert." };
  revalidatePath("/dashboard");
  return { success: true, alert: data };
}

export async function deletePriceAlert(alertId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Anda harus login terlebih dahulu." };
  }

  const { error } = await supabase
    .from("price_alerts")
    .delete()
    .eq("id", alertId)
    .eq("user_id", user.id);

  if (error) return { error: "Gagal menghapus alert." };
  revalidatePath("/dashboard");
  return { success: true };
}

export async function toggleAlertActive(alertId: string, isActive: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Anda harus login." };

  const { error } = await supabase
    .from("price_alerts")
    .update({ is_active: !isActive })
    .eq("id", alertId)
    .eq("user_id", user.id);

  if (error) return { error: "Gagal mengupdate alert." };
  revalidatePath("/dashboard");
  return { success: true };
}
