import { ImageResponse } from "next/og";
import { colors, OG_SIZE, radii } from "@/lib/og-tokens";
import { loadOgFonts } from "@/lib/og-fonts";

export const alt = "BijakBeli — Beli yang Tepat, di Waktu yang Tepat";
export const size = OG_SIZE;
export const contentType = "image/png";

const MARKETPLACES = [
  "Tokopedia",
  "Shopee",
  "Bukalapak",
  "Blibli",
  "Lazada",
  "TikTok Shop",
];

export default async function Image() {
  const fonts = await loadOgFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: `linear-gradient(135deg, ${colors.brandA} 0%, ${colors.brandB} 100%)`,
          color: colors.textOnDark,
          fontFamily: "Inter",
          padding: 64,
        }}
      >
        {/* Brand mark row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: -0.5,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "rgba(255,255,255,0.18)",
              fontSize: 32,
              fontWeight: 800,
              color: colors.textOnDark,
            }}
          >
            B
          </div>
          <div style={{ display: "flex" }}>BijakBeli</div>
        </div>

        {/* Headline block */}
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
              flexDirection: "column",
              fontSize: 84,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 980,
            }}
          >
            <div style={{ display: "flex" }}>Beli yang Tepat,</div>
            <div style={{ display: "flex" }}>di Waktu yang Tepat.</div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              fontWeight: 400,
              marginTop: 28,
              color: colors.textOnDarkMuted,
              maxWidth: 880,
              lineHeight: 1.3,
            }}
          >
            Bandingkan harga dari 6 marketplace Indonesia, deteksi diskon
            palsu, rekomendasi kapan waktu terbaik untuk beli.
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 22,
            color: colors.textOnDarkMuted,
          }}
        >
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {MARKETPLACES.map((m) => (
              <div
                key={m}
                style={{
                  display: "flex",
                  padding: "8px 16px",
                  borderRadius: radii.pill,
                  background: "rgba(255,255,255,0.14)",
                  fontSize: 20,
                  fontWeight: 500,
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
              color: colors.textOnDark,
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
