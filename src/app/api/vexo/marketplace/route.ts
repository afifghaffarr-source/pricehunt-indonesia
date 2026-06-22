import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { checkPersistentRateLimit, getRequestIdentifier } from "@/lib/rate-limit";
import { getVexoConfig } from "@/lib/env";

interface VexoMarketplaceData {
  status: number | boolean;
  data?: {
    product_name?: string;
    image_url?: string;
    current_price?: number;
    original_price?: number;
    discount_percent?: number;
    seller_name?: string;
    seller_rating?: number;
    product_rating?: number;
    review_count?: number;
    sold_count?: number;
    stock_status?: string;
    _meta?: { is_mock?: boolean; note?: string };
  };
  message?: string;
  error?: string;
}

export async function GET(request: NextRequest) {
  // v1.5.2: read env at request time so tests can override it.
  const { baseUrl: VEXO_BASE, apiKey: VEXO_KEY } = getVexoConfig();

  const user = await getAuthenticatedUser();
  const { searchParams } = request.nextUrl;
  const url = (searchParams.get("url") || "").trim();
  const productName = (searchParams.get("name") || "").trim();

  if (!url && !productName) {
    return NextResponse.json(
      { error: "Parameter 'url' atau 'name' diperlukan" },
      { status: 400 }
    );
  }

  // Rate limit
  const identifier = user?.id || getRequestIdentifier("anonymous", request);
  const rateLimit = await checkPersistentRateLimit({
    identifier,
    endpoint: "vexo-marketplace",
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Batas pencarian marketplace tercapai. Coba lagi nanti." },
      { status: 429 }
    );
  }

  if (!VEXO_KEY) {
    return NextResponse.json(
      { error: "VexoAPI key tidak dikonfigurasi", data: null },
      { status: 500 }
    );
  }

  try {
    const targetUrl = url
      ? encodeURIComponent(url)
      : encodeURIComponent(`https://shopee.co.id/search?q=${encodeURIComponent(productName)}`);

    const apiUrl = `${VEXO_BASE}/api/tools/marketplace?key=${VEXO_KEY}&url=${targetUrl}`;

    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(15000) });
    const data: VexoMarketplaceData = await res.json();

    if (!res.ok || !data.data) {
      return NextResponse.json(
        { error: data.message || data.error || "Gagal mengambil data marketplace", data: null },
        { status: 502 }
      );
    }

    const d = data.data;

    // v1.5.2: refuse to serve mock/fake data. VexoAPI's `/api/tools/marketplace`
    // currently returns `_meta.is_mock: true` for all calls (the endpoint is
    // not yet connected to a real marketplace data source). Passing that
    // through to the frontend would mean showing fake prices/images to users
    // — exactly the silent-failure mode we want to avoid. Surface the
    // unavailability instead so callers can fall back gracefully.
    if (d._meta?.is_mock) {
      return NextResponse.json(
        {
          error: "VexoAPI marketplace saat ini mengembalikan data mock. Fitur ini belum aktif.",
          data: null,
          mockDisabled: true,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      product: {
        name: d.product_name,
        imageUrl: d.image_url,
        currentPrice: d.current_price,
        originalPrice: d.original_price,
        discountPercent: d.discount_percent,
        seller: d.seller_name,
        sellerRating: d.seller_rating,
        productRating: d.product_rating,
        reviewCount: d.review_count,
        soldCount: d.sold_count,
        stockStatus: d.stock_status,
      },
      isMock: false,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("VexoAPI marketplace error:", msg);
    return NextResponse.json(
      { error: "VexoAPI marketplace sedang tidak tersedia", data: null },
      { status: 500 }
    );
  }
}
