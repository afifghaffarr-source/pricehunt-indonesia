"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
