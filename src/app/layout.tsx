import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PWARegister } from "@/components/common/PWARegister";
import { SkipToContent } from "@/components/common/SkipToContent";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { getAppUrl } from "@/lib/app-url";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const baseUrl = getAppUrl();

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "BijakBeli.app - Beli yang Tepat, di Waktu yang Tepat",
    template: "%s | BijakBeli.app",
  },
  description:
    "Beli yang Tepat, di Waktu yang Tepat. Bandingkan harga dari Tokopedia, Shopee, Bukalapak, Lazada, Blibli, dan TikTok Shop. Deteksi diskon palsu, rekomendasi kapan beli, hemat uang dengan cerdas!",
  keywords: [
    "perbandingan harga",
    "marketplace indonesia",
    "tokopedia",
    "shopee",
    "bukalapak",
    "lazada",
    "blibli",
    "tiktok shop",
    "harga termurah",
    "bandingkan harga",
  ],
  authors: [{ name: "BijakBeli.app" }],
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "BijakBeli.app",
    title: "BijakBeli.app - Beli yang Tepat, di Waktu yang Tepat",
    description:
      "Beli yang Tepat, di Waktu yang Tepat. Bandingkan harga dari 6 marketplace Indonesia, deteksi diskon palsu, rekomendasi kapan beli!",
    url: baseUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "BijakBeli.app - Beli yang Tepat, di Waktu yang Tepat",
    description:
      "Beli yang Tepat, di Waktu yang Tepat. Deteksi diskon palsu, rekomendasi kapan beli, hemat cerdas!",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${jakarta.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta name="theme-color" content="#2563eb" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icons/icon-192.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body className="min-h-dvh flex flex-col">
        <SkipToContent />
        <PWARegister />
        <Header />
        <main id="main-content" className="flex-1">{children}</main>
        <Footer />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
