import { ImageResponse } from "next/og";
import { colors, formatIdr, OG_SIZE, radii } from "@/lib/og-tokens";
import { loadOgFonts } from "@/lib/og-fonts";
import { getProductBySlugFromDB } from "@/lib/supabase/data";

export const alt = "BijakBeli — Detail Produk";
export const size = OG_SIZE;
export const contentType = "image/png";
// `getProductBySlugFromDB` reads from Supabase; can't be prerendered.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function ProductImage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlugFromDB(slug);
  const fonts = await loadOgFonts();

  // Fallback: render branded placeholder if product missing / no offers.
  if (!product || product.prices.length === 0 || product.lowestPrice === 0) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            background: colors.bg,
            color: colors.textPrimary,
            fontFamily: "Inter",
            fontSize: 64,
            fontWeight: 800,
          }}
        >
          BijakBeli
        </div>
      ),
      { ...size, fonts }
    );
  }

  const inStock = product.prices.filter((p) => p.inStock);
  const stockCount = inStock.length;
  const avg = Math.round(product.averagePrice);
  const dealScore = Math.round(product.dealScore);
  // `dealScore` is a 0–100 "good deal" rating, NOT a literal discount %.
  // Show the badge for genuinely high-scoring products.
  const isGoodDeal = dealScore >= 70;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: colors.bg,
          fontFamily: "Inter",
          padding: 56,
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 22,
            color: colors.textSecondary,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 24,
              fontWeight: 800,
              color: colors.textPrimary,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                borderRadius: 10,
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
              padding: "8px 18px",
              borderRadius: radii.pill,
              background: colors.bgMuted,
              border: `1px solid ${colors.border}`,
              fontWeight: 600,
            }}
          >
            {stockCount} marketplace
          </div>
        </div>

        {/* Product name */}
        <div
          style={{
            display: "flex",
            marginTop: 36,
            fontSize: 52,
            fontWeight: 800,
            color: colors.textPrimary,
            lineHeight: 1.1,
            letterSpacing: -1,
            maxWidth: 1080,
          }}
        >
          {product.name}
        </div>

        {/* Price block */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 32,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 24,
              color: colors.textMuted,
              fontWeight: 500,
            }}
          >
            Mulai dari
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 24,
              marginTop: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 88,
                fontWeight: 800,
                color: colors.textPrimary,
                letterSpacing: -2,
                lineHeight: 1,
              }}
            >
              {formatIdr(product.lowestPrice)}
            </div>
            {isGoodDeal ? (
              <div
                style={{
                  display: "flex",
                  fontSize: 28,
                  fontWeight: 700,
                  color: colors.deal,
                  background: colors.dealBg,
                  padding: "8px 18px",
                  borderRadius: radii.pill,
                }}
              >
                Deal Score {dealScore}
              </div>
            ) : null}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 24,
              color: colors.textSecondary,
              marginTop: 16,
              fontWeight: 500,
            }}
          >
            Rata-rata {formatIdr(avg)} · {stockCount} toko tersedia
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "auto",
            fontSize: 20,
            color: colors.textMuted,
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {product.prices.slice(0, 4).map((p) => (
              <div
                key={p.marketplace}
                style={{
                  display: "flex",
                  padding: "6px 14px",
                  borderRadius: radii.pill,
                  background: colors.bgMuted,
                  border: `1px solid ${colors.border}`,
                  color: p.inStock ? colors.textPrimary : colors.textMuted,
                  fontWeight: 600,
                  fontSize: 18,
                  opacity: p.inStock ? 1 : 0.55,
                }}
              >
                {p.marketplace}
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
    { ...size, fonts }
  );
}
