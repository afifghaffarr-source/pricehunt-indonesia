import { ImageResponse } from "next/og";
import { colors, OG_SIZE, radii } from "@/lib/og-tokens";
import { loadOgFonts } from "@/lib/og-fonts";

export const alt = "BijakBeli — Penawaran Terbaik Hari Ini";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const fonts = await loadOgFonts();

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: `linear-gradient(160deg, ${colors.brandA} 0%, ${colors.brandB} 60%, ${colors.brandC} 100%)`,
          color: colors.textOnDark,
          fontFamily: "Inter",
          padding: 64,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 28,
            fontWeight: 800,
            color: colors.textOnDarkMuted,
          }}
        >
          <div
            style={{
              display: "flex",
              padding: "8px 20px",
              borderRadius: radii.pill,
              background: "rgba(255,255,255,0.16)",
              fontSize: 22,
              fontWeight: 700,
              color: colors.textOnDark,
            }}
          >
            HOT
          </div>
          <div style={{ display: "flex" }}>Deals</div>
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
              flexDirection: "column",
              fontSize: 96,
              fontWeight: 800,
              lineHeight: 1.02,
              letterSpacing: -2.5,
              maxWidth: 1000,
            }}
          >
            <div style={{ display: "flex" }}>Penawaran Terbaik,</div>
            <div style={{ display: "flex" }}>Diperbarui Setiap Hari.</div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              fontWeight: 400,
              marginTop: 32,
              color: colors.textOnDarkMuted,
              maxWidth: 880,
              lineHeight: 1.3,
            }}
          >
            Kami deteksi diskon palsu, filter yang benar-benar turun harga,
            dan ranking berdasarkan deal score.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 22,
            color: colors.textOnDarkMuted,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 20,
              fontSize: 22,
              fontWeight: 600,
            }}
          >
            <div style={{ display: "flex" }}>Tanpa login</div>
            <div style={{ display: "flex" }}>6 marketplace</div>
            <div style={{ display: "flex" }}>100% gratis</div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 24,
              fontWeight: 700,
              color: colors.textOnDark,
            }}
          >
            bijakbeli.web.id/deals
          </div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
