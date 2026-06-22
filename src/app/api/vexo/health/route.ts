import { NextResponse } from "next/server";
import { isVexoConfigured } from "@/lib/vexo/client";
import { getVexoConfig } from "@/lib/env";

export async function GET() {
  const configured = isVexoConfigured();
  const { baseUrl, timeoutMs, cacheTtlSeconds } = getVexoConfig();

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
    cacheTTL: cacheTtlSeconds,
    hasKey: !!getVexoConfig().apiKey,
  });
}