import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { colors, OG_SIZE, radii } from "@/lib/og-tokens";
import { loadOgFonts } from "@/lib/og-fonts";

/**
 * Dynamic OG image for /search?q=…
 *
 * `opengraph-image.tsx` file convention does not receive `searchParams`,
 * so we use a route handler that reads the query from the request URL and
 * returns a tailored 1200x630 preview. The /search page's `metadata`
 * references this URL as its `openGraph.images` override.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MARKETPLACES = [
  "Tokopedia",
  "Shopee",
  "Bukalapak",
  "Blibli",
  "Lazada",
  "TikTok",
];

export async function GET(request: NextRequest) {
  const fonts = await loadOgFonts();
  const q = request.nextUrl.searchParams.get("q")?.trim().slice(0, 60) ?? "";
  const hasQuery = q.length > 0;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: colors.bg,
          color: colors.textPrimary,
          fontFamily: "Inter",
          padding: 64,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 26,
            fontWeight: 800,
            color: colors.textPrimary,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: 12,
              background: `linear-gradient(135deg, ${colors.brandA}, ${colors.brandB})`,
              color: "white",
              fontSize: 22,
              fontWeight: 800,
            }}
          >
            B
          </div>
          <div style={{ display: "flex" }}>BijakBeli</div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "auto",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 28,
              color: colors.textMuted,
              fontWeight: 600,
            }}
          >
            {hasQuery ? "Hasil pencarian untuk" : "Cari & bandingkan harga"}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: hasQuery ? 72 : 88,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              marginTop: 16,
              color: colors.textPrimary,
              maxWidth: 1080,
            }}
          >
            {hasQuery ? `"${q}"` : "Bandingkan harga di 6 marketplace"}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 22,
            color: colors.textMuted,
            marginTop: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              fontSize: 20,
              fontWeight: 600,
            }}
          >
            {MARKETPLACES.map((m) => (
              <div
                key={m}
                style={{
                  display: "flex",
                  padding: "8px 16px",
                  borderRadius: radii.pill,
                  background: colors.bgMuted,
                  border: `1px solid ${colors.border}`,
                  color: colors.textSecondary,
                }}
              >
                {m}
              </div>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              fontWeight: 700,
              color: colors.textPrimary,
            }}
          >
            bijakbeli.web.id
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts }
  );
}
