import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
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
  ],
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
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
