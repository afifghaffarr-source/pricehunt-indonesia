import { NextRequest, NextResponse } from "next/server";
import { exportBackup, generateSeedSQL } from "@/lib/backup";
import { requireAdmin } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  // ✅ SECURITY: Require admin authentication
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const backup = await exportBackup();
    const sql = generateSeedSQL(backup);

    return new NextResponse(sql, {
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": `attachment; filename="pricehunt-backup-${backup.timestamp}.sql"`,
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
