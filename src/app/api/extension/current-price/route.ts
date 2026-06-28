import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/extension/current-price?url=<encoded>
 *
 * Returns the most-recent known price for a given marketplace product URL.
 * Used by the BijakBeli extension's price-drop alert watcher to decide
 * whether to fire a desktop notification.
 *
 * Auth: requires INGESTION_SECRET as `Authorization: Bearer ***.
 * Same auth model as /api/ingestion routes. Returns 401 otherwise.
 *
 * Response shape (200 OK):
 *   {
 *     url: string,
 *     title: string | null,
 *     marketplace: string | null,   // e.g. "shopee", "tokopedia"
 *     current_price: number | null, // integer in IDR (rupiah)
 *     updated_at: string | null,    // ISO 8601
 *   }
 *
 * Data source: the `offers` table is the canonical row per URL (URL is
 * UNIQUE per migration 114). The `current_price` column reflects the
 * most-recent scrape — extension_snapshot rows are kept in
 * `price_snapshots` for full historical aggregation, but the watchlist
 * feature only needs the "now" price.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  const expected = process.env.INGESTION_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json(
      { error: "missing url query parameter" },
      { status: 400 }
    );
  }

  // Cheap SSRF guard: only allow the marketplace hosts the extension
  // actually scrapes. Production URLs span both .com and .co.id variants,
  // and we accept both with or without www/subdomain prefix.
  // Source of truth: SELECT DISTINCT host(offers.url) FROM offers.
  const ALLOWED_HOST_PATTERNS = [
    // Shopee
    /^https?:\/\/(?:[a-z0-9-]+\.)?shopee\.co\.id\//,
    // Tokopedia — both .com and .co.id, with or without www
    /^https?:\/\/(?:[a-z0-9-]+\.)?tokopedia\.com\//,
    /^https?:\/\/(?:[a-z0-9-]+\.)?tokopedia\.co\.id\//,
    // Lazada, Blibli, Bukalapak — both .com and .co.id
    /^https?:\/\/(?:[a-z0-9-]+\.)?lazada\.co\.id\//i,
    /^https?:\/\/(?:[a-z0-9-]+\.)?lazada\.com\//i,
    /^https?:\/\/(?:[a-z0-9-]+\.)?blibli\.com\//,
    /^https?:\/\/(?:[a-z0-9-]+\.)?blibli\.co\.id\//,
    /^https?:\/\/(?:[a-z0-9-]+\.)?bukalapak\.com\//,
    /^https?:\/\/(?:[a-z0-9-]+\.)?bukalapak\.co\.id\//,
    // TikTok Shop — both domains
    /^https?:\/\/(?:[a-z0-9-]+\.)?tiktok\.com\//,
    /^https?:\/\/(?:[a-z0-9-]+\.)?tiktok\.co\.id\//,
    /^https?:\/\/shop\.tiktok\.com\//,
  ];
  if (!ALLOWED_HOST_PATTERNS.some((re) => re.test(url))) {
    return NextResponse.json(
      { error: "url not in allowed marketplace list" },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();

    // Query the `offers` table directly. After the 114 migration,
    // offers.url is UNIQUE — so this returns at most one row.
    // Join marketplaces for the readable name (slug) of the source.
    const { data, error } = await supabase
      .from("offers")
      .select("url, title, current_price, updated_at, marketplaces(name)")
      .eq("url", url)
      .maybeSingle();

    if (error) {
      // PostgREST errors → 502 (extension should retry the next alarm cycle).
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    // Even when offers has no row for this exact URL, the extension
    // should get a 200 with nulls — so it can distinguish "we don't have
    // this URL yet" from "server error". Retry logic shouldn't fire.
    if (!data) {
      return NextResponse.json(
        {
          url,
          title: null,
          marketplace: null,
          current_price: null,
          updated_at: null,
        },
        { status: 200 }
      );
    }

    // The PostgREST embedded join lands on a single object (string|null),
    // sometimes as an array depending on relationship cardinality. Handle both.
    const marketplaceRow = Array.isArray(data.marketplaces)
      ? data.marketplaces[0]
      : data.marketplaces;

    return NextResponse.json(
      {
        url: data.url,
        title: data.title ?? null,
        marketplace: marketplaceRow?.name ?? null,
        current_price:
          typeof data.current_price === "number" ? data.current_price : null,
        updated_at: data.updated_at ?? null,
      },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
