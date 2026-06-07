import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { checkAndSendPriceAlerts } = await import("@/lib/email");
    const result = await checkAndSendPriceAlerts();
    return NextResponse.json(result);
  } catch (err) {
    console.error("Alert check error:", err);
    return NextResponse.json({ error: "Gagal mengecek alerts" }, { status: 500 });
  }
}
