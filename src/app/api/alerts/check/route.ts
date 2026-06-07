import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  // ✅ SECURITY: Require cron secret (fail closed)
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    const { checkAndSendPriceAlerts } = await import("@/lib/email");
    const result = await checkAndSendPriceAlerts();
    return NextResponse.json(result);
  } catch (err) {
    console.error("Alert check error:", err);
    return NextResponse.json({ error: "Gagal mengecek alerts" }, { status: 500 });
  }
}
