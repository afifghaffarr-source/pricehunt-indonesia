"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/app-url";

export type AuthState = {
  error?: string;
  success?: boolean;
} | undefined;

export async function login(state: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email dan password wajib diisi." };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: `Login gagal: ${error.message}` };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function register(state: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const displayName = formData.get("name") as string;

  if (!email || !password || !displayName) {
    return { error: "Semua field wajib diisi." };
  }

  if (password.length < 6) {
    return { error: "Password minimal 6 karakter." };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
    },
  });

  if (error) {
    return { error: `Register gagal: ${error.message}` };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(
  state: AuthState,
  formData: FormData
): Promise<AuthState> {
  const supabase = await createClient();

  const email = formData.get("email") as string;

  if (!email) {
    return { error: "Email wajib diisi." };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getAppUrl()}/auth/reset-password`,
  });

  if (error) {
    return { error: `Gagal mengirim email reset: ${error.message}` };
  }

  return { success: true };
}

export async function resetPassword(
  state: AuthState,
  formData: FormData
): Promise<AuthState> {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    return { error: "Password dan konfirmasi password wajib diisi." };
  }

  if (password.length < 6) {
    return { error: "Password minimal 6 karakter." };
  }

  if (password !== confirmPassword) {
    return { error: "Password dan konfirmasi password tidak cocok." };
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return { error: `Gagal mereset password: ${error.message}` };
  }

  revalidatePath("/", "layout");
  redirect("/auth/login?reset=success");
}
