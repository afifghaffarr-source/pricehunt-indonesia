import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/api-auth";
import { runOrphanAutoLink } from "@/lib/cron/orphan-auto-link";

/**
 * Cron job: nightly re-match orphan offers.
 *
 * Runs daily 02:00 WIB (19:00 UTC) via Vercel Cron. Re-runs the
 * `findBestProductMatch` matcher on offers whose `product_id` is NULL
 * (created within the last 90 days) and auto-links any that score
 * "high" or "medium" confidence. Bounded to 500 offers per run.
 *
 * Auth: `verifyCronSecret` (Authorization: Bearer <CRON_SECRET>).
 * Audit: writes a row to `admin_audit_log` after every run.
 *
 * Query params (optional, override defaults):
 *   cap          — max offers to process (default 500)
 *   max_age_days — skip offers older than N days (default 90)
 */
async function handle(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const cap = Number(url.searchParams.get("cap")) || 500;
  const maxAgeDays = Number(url.searchParams.get("max_age_days")) || 90;

  try {
    const result = await runOrphanAutoLink({ cap, maxAgeDays });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
