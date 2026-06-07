import { NextResponse } from "next/server";
import { getApiSources } from "@/lib/api-registry/data";
import { isVexoConfigured } from "@/lib/vexo/client";

export async function GET() {
  try {
    const sources = await getApiSources();
    const results: Array<{ slug: string; name: string; status: string; reachable: boolean; message: string }> = [];

    const vexoStatus = isVexoConfigured() ? "active" : "not_configured";
    results.push({ slug: "vexo-api", name: "VexoAPI", status: vexoStatus, reachable: isVexoConfigured(), message: isVexoConfigured() ? "Configured" : "VEXO_API_KEY not set" });

    for (const source of sources) {
      if (source.slug === "vexo-api") continue;
      if (source.status === "planned") {
        results.push({ slug: source.slug, name: source.name, status: "planned", reachable: false, message: "Not yet implemented" });
        continue;
      }
      if (source.base_url) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const start = Date.now();
          const res = await fetch(source.base_url, { method: "HEAD", signal: controller.signal }).catch(() => null);
          clearTimeout(timeout);
          const duration = Date.now() - start;
          const reachable = res !== null && res.status < 500;
          results.push({ slug: source.slug, name: source.name, status: reachable ? "active" : "unreachable", reachable, message: reachable ? `OK (${duration}ms)` : `HTTP ${res?.status || "timeout"}` });
        } catch {
          results.push({ slug: source.slug, name: source.name, status: "error", reachable: false, message: "Connection failed" });
        }
      } else {
        results.push({ slug: source.slug, name: source.name, status: source.status, reachable: false, message: "No base URL configured" });
      }
    }

    return NextResponse.json({ total: results.length, results });
  } catch {
    return NextResponse.json({ error: "Health check failed" }, { status: 500 });
  }
}