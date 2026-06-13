/**
 * Secure admin authorization helpers.
 *
 * Single source of truth for admin checks. NEVER reads from
 * `user_profiles.preferences.is_admin` (that field is user-editable via
 * the self-update RLS policy on user_profiles, which would allow
 * privilege escalation).
 *
 * The authoritative source is the `admin_users` table (migration 121),
 * which is RLS-protected so regular users cannot self-promote.
 *
 * Usage:
 *   - Server components / server actions: `await assertAdminPage()`
 *   - API routes:                          `await requireAdmin(request)`
 */

import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser } from "@/lib/supabase/auth";

/**
 * Check if a user has admin privileges.
 * Reads from `admin_users` via the `is_admin` SQL function.
 * Returns false on any error (fail-closed).
 */
export async function isUserAdmin(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("is_admin", { uid: userId });
    if (error) {
      // If the function is not yet deployed, fail closed.
      // Surface the error in server logs but do not leak to caller.
      console.error("[admin-auth] is_admin RPC error:", error.message);
      return false;
    }
    return data === true;
  } catch (err) {
    console.error("[admin-auth] isUserAdmin exception:", err);
    return false;
  }
}

/**
 * API-route guard. Use as the very first call in any /api/admin handler.
 * Returns either a NextResponse (with 401/403) OR the authenticated user
 * + a server-side supabase client. NEVER creates an admin client before
 * the admin check passes.
 */
export type AdminGuardResult =
  | { ok: true; user: { id: string; email: string | null }; supabase: Awaited<ReturnType<typeof createClient>> }
  | { ok: false; response: NextResponse };

export async function requireAdmin(_request?: NextRequest): Promise<AdminGuardResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const user = data?.user ?? null;

  if (error || !user) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      ),
    };
  }

  const admin = await isUserAdmin(user.id);
  if (!admin) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Admin privileges required" },
        { status: 403 }
      ),
    };
  }

  return { ok: true, user: { id: user.id, email: user.email ?? null }, supabase };
}

/**
 * Server-side admin client. Returns the service-role client ONLY if the
 * caller is an authenticated admin. Otherwise returns null. Use this in
 * API routes that need elevated DB privileges AFTER requireAdmin passes.
 */
export async function getAdminSupabaseForAdmin() {
  const user = await getUser();
  if (!user) return null;
  const admin = await isUserAdmin(user.id);
  if (!admin) return null;
  return createAdminClient();
}

/**
 * Server-component / server-action guard. Redirects to login for guests
 * and to dashboard for non-admins. Use inside `layout.tsx` or `page.tsx`.
 */
export async function assertAdminPage(redirectToLogin = "/auth/login"): Promise<{ id: string; email: string | null }> {
  const user = await getUser();
  if (!user) redirect(redirectToLogin);

  const admin = await isUserAdmin(user.id);
  if (!admin) {
    // Non-admin authenticated user — fail closed, do not leak the page.
    redirect("/dashboard?error=forbidden");
  }

  return { id: user.id, email: user.email ?? null };
}
