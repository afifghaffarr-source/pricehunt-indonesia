import { NextRequest, NextResponse } from "next/server";
import { exportBackup, generateSeedSQL } from "@/lib/backup";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * GET /api/backup
 * Admin-only. Downloads a .sql seed file containing products, marketplaces,
 * offers, and price_snapshots.
 *
 * Format: text/plain with Content-Disposition: attachment.
 * The file is idempotent (uses ON CONFLICT DO NOTHING) and wraps in a
 * transaction so partial apply can't leave inconsistent state.
 */
export async function GET(request: NextRequest) {
  // ✅ SECURITY: Require admin authentication
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  try {
    const backup = await exportBackup();
    const sql = generateSeedSQL(backup);

    return new NextResponse(sql, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="bijakbeli-backup-${backup.timestamp}.sql"`,
        // Do not cache — backup is point-in-time
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Backup generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate backup" },
      { status: 500 }
    );
  }
}
