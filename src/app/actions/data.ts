"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

  if (!targetPrice || targetPrice <= 0) {
    return { error: "Harga target tidak valid." };
  }

  const { error } = await supabase
    .from("price_alerts")
    .insert({
      user_id: user.id,
      product_id: productId,
      target_price: targetPrice,
    });

  if (error) return { error: "Gagal membuat price alert." };
  revalidatePath("/dashboard");
  return { success: true };
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
