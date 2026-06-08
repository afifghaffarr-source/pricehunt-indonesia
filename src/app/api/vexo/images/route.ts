import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { checkPersistentRateLimit, getRequestIdentifier } from "@/lib/rate-limit";
import { searchImages, isVexoConfigured } from "@/lib/vexo/client";

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
    return json({ error: "Silakan login untuk memakai pencarian gambar." }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const q = (searchParams.get("q") || "").trim().slice(0, MAX_QUERY_LENGTH);
  const engine = (searchParams.get("engine") || "google") as "google" | "bing";
  const limit = Math.min(parseInt(searchParams.get("limit") || "8", 10), 20);

  if (!q) {
    return json({ error: "Parameter 'q' diperlukan" }, { status: 400 });
  }

  const rateLimit = await checkPersistentRateLimit({
    identifier: getRequestIdentifier(user.id, request),
    endpoint: "vexo-images",
    limit: RATE_LIMIT_MAX,
    windowMs: RATE_LIMIT_WINDOW_MS,
  });
  if (!rateLimit.allowed) {
    return json({ error: "Batas pencarian gambar tercapai. Coba lagi nanti." }, { status: 429 });
  }

  if (!isVexoConfigured()) {
    return json({
      results: [],
      query: q,
      source: "vexo-unavailable",
    });
  }

  try {
    const result = await searchImages(q, engine);

    return json({
      results: (result.data?.results || []).slice(0, limit),
      count: result.data?.results?.length || 0,
      query: q,
      engine,
      source: "vexo",
    });
  } catch (err) {
    console.error("Vexo images error:", err);
    return json({
      results: [],
      query: q,
      error: "Pencarian gambar sedang tidak tersedia.",
    }, { status: 500 });
  }
}
