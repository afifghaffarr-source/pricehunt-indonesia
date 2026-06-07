import { NextResponse } from "next/server";
import { exportBackup, generateSeedSQL } from "@/lib/backup";

export async function GET() {
  try {
    const backup = await exportBackup();
    const sql = generateSeedSQL(backup);

    return new NextResponse(sql, {
      headers: {
        "Content-Type": "application/sql",
        "Content-Disposition": `attachment; filename="pricehunt-backup-${backup.timestamp}.sql"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Backup failed", details: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
