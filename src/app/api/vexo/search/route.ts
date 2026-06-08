import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { discoverProducts, discoverProductsAcrossMarketplaces } from "@/lib/marketplace/vexo-adapter";
import { checkPersistentRateLimit, getRequestIdentifier } from "@/lib/rate-limit";
import { isVexoConfigured } from "@/lib/vexo/client";

const MAX_QUERY_LENGTH = 120;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 30;

function json(data: unknown, init?: ResponseInit) {
  const response = NextResponse.json(data, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return json({ error: "Silakan login untuk memakai pencarian Vexo." }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const q = (searchParams.get("q") || "").trim().slice(0, MAX_QUERY_LENGTH);
  const marketplace = searchParams.get("marketplace") || undefined;
  const mode = searchParams.get("mode") || "focused";
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

  if (!q) {
    return json({ error: "Parameter 'q' diperlukan" }, { status: 400 });
  }

  const rateLimit = await checkPersistentRateLimit({
    identifier: getRequestIdentifier(user.id, request),
    endpoint: "vexo-search",
    limit: RATE_LIMIT_MAX,
    windowMs: RATE_LIMIT_WINDOW_MS,
  });
  if (!rateLimit.allowed) {
    return json({ error: "Batas pencarian pintar tercapai. Coba lagi nanti." }, { status: 429 });
  }

  if (!isVexoConfigured()) {
    return json({
      results: [],
      query: q,
      source: "vexo-unavailable",
      message: "VexoAPI belum dikonfigurasi",
    });
  }

  try {
    const products = marketplace || mode !== "marketplaces"
      ? await discoverProducts(q, marketplace)
      : await discoverProductsAcrossMarketplaces(q);

    return json({
      results: products.slice(0, limit),
      query: q,
      marketplace,
      mode,
      source: "vexo",
      count: products.length,
    });
  } catch (err) {
    console.error("Vexo search error:", err);
    return json({
      results: [],
      query: q,
      source: "vexo-error",
      error: "Pencarian pintar sedang tidak tersedia.",
    }, { status: 500 });
  }
}
