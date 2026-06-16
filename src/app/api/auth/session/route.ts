import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Lightweight session endpoint consumed by client components (e.g. the
 * Header's admin badge) that need to know whether a user is signed in
 * and — if so — whether they are an admin.
 *
 * Returns:
 *   200 { user: null }                       — not signed in
 *   200 { user: { id, email, is_admin } }   — signed in
 *
 * We deliberately do NOT return tokens or the full profile. The client
 * only needs identity + role flags for UI gating.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ user: null });
    }

    // Look up profile to fetch is_admin flag.
    const { data: profile, error: profileErr } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr) {
      // Non-fatal: return user without admin flag rather than 500.
      return NextResponse.json({
        user: { id: user.id, email: user.email, is_admin: false },
      });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        is_admin: Boolean(profile?.is_admin),
      },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}
