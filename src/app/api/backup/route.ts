import { NextRequest, NextResponse } from "next/server";
import { exportBackup, generateSeedSQL } from "@/lib/backup";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  // ✅ SECURITY: Require admin authentication
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  try {
    const backup = await exportBackup();
    const sql = generateSeedSQL(backup);

    return new NextResponse(sql, {
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": `attachment; filename="bijakbeli-backup-${backup.timestamp}.sql"`,
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
