"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/auth";

export type SettingsState = { error?: string; success?: boolean } | undefined;

export async function updateProfile(state: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await getUser();
  if (!user) return { error: "Anda harus login." };

  const supabase = await createClient();
  const displayName = formData.get("display_name") as string;

  if (!displayName || displayName.length < 2) {
    return { error: "Nama minimal 2 karakter." };
  }

  const { error } = await supabase
    .from("user_profiles")
    .update({ display_name: displayName })
    .eq("id", user.id);

  if (error) return { error: `Gagal: ${error.message}` };

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { success: true };
}

export async function updatePassword(state: SettingsState, formData: FormData): Promise<SettingsState> {
  const supabase = await createClient();
  const newPassword = formData.get("new_password") as string;
  const confirmPassword = formData.get("confirm_password") as string;

  if (!newPassword || newPassword.length < 6) {
    return { error: "Password minimal 6 karakter." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "Konfirmasi password tidak cocok." };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) return { error: `Gagal: ${error.message}` };

  return { success: true };
}
