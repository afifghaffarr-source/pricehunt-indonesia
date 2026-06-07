import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pricehunt.id";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "PriceHunt Indonesia — Bandingkan Harga Marketplace",
    template: "%s | PriceHunt Indonesia",
  },
  description:
    "Bandingkan harga produk dari Tokopedia, Shopee, Bukalapak, Lazada, Blibli, dan TikTok Shop dalam satu tempat. Temukan harga terbaik dan hemat uang!",
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
  authors: [{ name: "PriceHunt Indonesia" }],
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "PriceHunt Indonesia",
    title: "PriceHunt Indonesia — Bandingkan Harga Marketplace",
    description:
      "Bandingkan harga dari 6 marketplace Indonesia dalam satu tempat. Temukan harga terbaik!",
    url: baseUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "PriceHunt Indonesia — Bandingkan Harga Marketplace",
    description:
      "Bandingkan harga dari 6 marketplace Indonesia dalam satu tempat.",
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
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta name="theme-color" content="#2563eb" />
      </head>
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
