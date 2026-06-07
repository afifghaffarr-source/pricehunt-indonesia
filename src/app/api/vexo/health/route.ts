import { NextResponse } from "next/server";
import { isVexoConfigured } from "@/lib/vexo/client";

export async function GET() {
  const configured = isVexoConfigured();
  const baseUrl = process.env.VEXO_API_BASE_URL || "";
  const timeoutMs = parseInt(process.env.VEXO_API_TIMEOUT_MS || "10000", 10);
  const cacheTTL = parseInt(process.env.VEXO_CACHE_TTL_SECONDS || "3600", 10);

  let apiReachable = false;
  if (configured && baseUrl) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(baseUrl, { signal: controller.signal });
      clearTimeout(t);
      apiReachable = res.ok || res.status < 500;
    } catch {
      apiReachable = false;
    }
  }

  return NextResponse.json({
    configured,
    apiReachable,
    baseUrl: configured ? baseUrl.replace(/\/api.*$/, "") : null,
    timeoutMs,
    cacheTTL,
    hasKey: !!process.env.VEXO_API_KEY,
  });
}
