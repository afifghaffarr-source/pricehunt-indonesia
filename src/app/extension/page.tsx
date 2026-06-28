import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Package,
  Zap,
  Shield,
  TrendingUp,
  CheckCircle2,
  MousePointerClick,
  ExternalLink,
  HelpCircle,
  Rocket,
} from "lucide-react";
import Link from "next/link";
import { CHROME_WEB_STORE_URL, isLiveOnChromeWebStore } from "@/lib/extension-links";
import { cookies } from "next/headers";
import { DevBannerToolbar } from "@/components/dev-preview-toolbar";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Chrome Extension - BijakBeli.app",
  description: "Download ekstensi Chrome BijakBeli v3.0.1 — auto-scrape marketplace Indonesia (Shopee, Tokopedia, Lazada, Blibli, Bukalapak, TikTok Shop) untuk membantu komunitas.",
  alternates: {
    canonical: "/extension",
  },
};

export default async function ExtensionPage() {
  const isLive = isLiveOnChromeWebStore;
  const cwsUrl = CHROME_WEB_STORE_URL;
  const isProduction = process.env.NODE_ENV === "production";

  // Banner mode is decided by:
  //   1) preview cookie set by DevBannerToolbar (dev only) — wins over env
  //   2) NEXT_PUBLIC_CWS_PUBLISHED env var on production (once officially live)
  //   3) Default to "draft" when env vars unset
  const cookieStore = await cookies();
  const previewOverride = cookieStore.get("bijakbeli_banner_preview")?.value ?? null;

  let bannerMode: "live" | "legacy" | "draft";
  if (previewOverride === "live" || previewOverride === "legacy" || previewOverride === "draft") {
    bannerMode = previewOverride;
  } else if (isLive && cwsUrl) {
    bannerMode = "live";
  } else {
    bannerMode = "draft";
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Post-launch banner — one of three variants. See
          src/components/banner-preview.tsx for the dev-only preview switcher
          (gated by NODE_ENV check; never ships to production). */}
      {bannerMode === "live" && cwsUrl && (
        <div
          data-banner="live"
          className="mb-4 flex flex-col items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 sm:flex-row sm:p-5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                Sekarang live di Chrome Web Store
              </p>
              <p className="text-sm text-emerald-800/80 dark:text-emerald-300/80">
                Install langsung dari CWS — tidak perlu download manual.
              </p>
            </div>
          </div>
          <a href={cwsUrl} target="_blank" rel="noopener noreferrer">
            <Button className="bg-emerald-700 hover:bg-emerald-800">
              <ExternalLink className="mr-2 h-4 w-4" />
              Buka di CWS
            </Button>
          </a>
        </div>
      )}

      {bannerMode === "legacy" && (
        <div
          data-banner="legacy"
          role="status"
          className="mb-4 flex flex-col items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 sm:flex-row sm:p-5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15">
              <Download className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-200">
                Masih versi beta — install via file .tar.gz
              </p>
              <p className="text-sm text-amber-800/80 dark:text-amber-300/80">
                Chrome Web Store akan menyusul setelah masa beta sekitar 2-4 minggu.
              </p>
            </div>
          </div>
          <Link href="/downloads/bijakbeli-extension-v3.0.1.tar.gz" download>
            <Button variant="outline" className="border-amber-500/40 text-amber-900 hover:bg-amber-500/10 dark:text-amber-100">
              <Download className="mr-2 h-4 w-4" />
              Download .tar.gz
            </Button>
          </Link>
        </div>
      )}

      {bannerMode === "draft" && (
        <div
          data-banner="draft"
          className="mb-4 flex flex-col items-center justify-between gap-3 rounded-lg border border-zinc-300 bg-zinc-100/80 p-4 sm:flex-row sm:p-5 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-300/60 dark:bg-zinc-800">
              <Rocket className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
            </div>
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                Segera rilis di Chrome Web Store
              </p>
              <p className="text-sm text-zinc-700 dark:text-zinc-400">
                Sementara waktu, install via .tar.gz di bawah. Submit ke CWS sedang berlangsung.
              </p>
            </div>
          </div>
          <Link href="/downloads/bijakbeli-extension-v3.0.1.tar.gz" download>
            <Button variant="outline" className="border-zinc-400 dark:border-zinc-700">
              <Download className="mr-2 h-4 w-4" />
              Download .tar.gz
            </Button>
          </Link>
        </div>
      )}

      {/* Dev-only preview switcher for the banner variants above. */}
      {/* Hidden in production builds via the NODE_ENV guard below. */}
      {!isProduction && <DevBannerToolbar />}

      {/* Hero Section */}
      <div className="mb-12 text-center">
        <Badge variant="secondary" className="mb-4 border-primary/20">
          v3.0.1 — Auto-Scrape
        </Badge>
        <h1 className="mb-4 text-4xl font-bold tracking-tight">
          BijakBeli Chrome Extension
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Browsing marketplace = otomatis bantu BijakBeli. Setiap halaman produk
          yang kamu lihat, data harganya otomatis terkirim ke database kami.
          Bantu ribuan pembeli Indonesia! 🇮🇩
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          <Link href="/blog/bijakbeli-extension-launch" className="hover:text-foreground hover:underline">
            Baca pengumuman peluncuran v3 →
          </Link>
          <span className="mx-2 text-border">·</span>
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            Price drop alerts segera hadir — Q3 2026
          </span>
        </p>
      </div>

      {/* Download Card */}
      <Card className="mx-auto mb-12 max-w-2xl border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Package className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Download Extension</CardTitle>
          <CardDescription>
            v3.0.1 — Gratis untuk semua pengguna
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link href="/downloads/bijakbeli-extension-v3.0.1.tar.gz" download>
            <Button size="lg" className="w-full text-lg">
              <Download className="mr-2 h-5 w-5" /> Download Extension
            </Button>
          </Link>
          <p className="text-center text-sm text-muted-foreground">
            Manifest V3 • ~50 KB • 6 marketplace support
          </p>
        </CardContent>
      </Card>

      {/* Beta Testing Card — secret is delivered out-of-band via the
          extension's first-run onboarding flow (popup form + secure
          channel). NEVER embed secrets in public HTML. The previous
          version of this section (commits ≤ 1866f78) hard-coded the
          INGESTION_SECRET in plain text on the page, which was a
          critical credential leak. See CHANGELOG v1.5.28. */}
      <Card className="mx-auto mb-12 max-w-2xl border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
            <Shield className="h-6 w-6 text-amber-600" />
          </div>
          <CardTitle className="text-xl">Beta Testing — Bagaimana Caranya</CardTitle>
          <CardDescription>
            Cara konfigurasi ingestion key untuk beta testers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4 text-sm text-foreground">
            <p className="mb-2 text-foreground">
              <strong>Cara pakai:</strong>
            </p>
            <ol className="ml-4 list-decimal space-y-1">
              <li>Install extension dari link download di atas</li>
              <li>Klik icon extension di toolbar Chrome → buka Settings</li>
              <li>
                Ingestion key akan diminta pada first-run. Kami kirim key via
                secure channel (bukan via halaman publik) — lihat
                <code className="mx-1 rounded bg-background px-1 text-xs">README</code>
                repo extension atau hubungi maintainer untuk onboarding beta.
              </li>
              <li>Paste key di field &quot;Ingestion Key&quot; lalu klik Save</li>
            </ol>
          </div>
          <p className="text-xs text-muted-foreground">
            Secret key dirotasi berkala. Versi publik extension (Chrome Web Store) tidak akan membutuhkan key — semuanya lewat proxy server kami.
          </p>
        </CardContent>
      </Card>

      {/* Changelog Card */}
      <Card className="mx-auto mb-12 max-w-2xl border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
        <CardHeader>
          <CardTitle className="text-lg">Changelog</CardTitle>
          <CardDescription>Update terbaru extension</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="border-l-2 border-primary pl-4">
            <div className="mb-1 flex items-center gap-2">
              <Badge variant="default">v3.0.1</Badge>
              <span className="text-xs text-muted-foreground">2026-06-27 (Latest)</span>
            </div>
            <p className="text-sm font-medium text-foreground">URL Collision Fix</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>• Fixed URL collision di Lazada, Blibli, Bukalapak search results</li>
              <li>• Marketplace scraper improved product URL extraction</li>
            </ul>
          </div>
          <div className="border-l-2 border-muted pl-4">
            <div className="mb-1 flex items-center gap-2">
              <Badge variant="outline">v3.0.0</Badge>
              <span className="text-xs text-muted-foreground">2026-06-23</span>
            </div>
            <p className="text-sm font-medium text-muted-foreground">Auto-Scrape Mode</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>• Auto-scrape PDP & search results dari 6 marketplace</li>
              <li>• Background service worker (Manifest V3 compliant)</li>
              <li>• SPA-aware: handle dynamic loading (Shopee, Tokopedia)</li>
              <li>• Side panel dengan stats & history</li>
              <li>• Dedupe otomatis (1 jam per URL)</li>
              <li>• JSON-LD fallback untuk marketplace tanpa selector</li>
            </ul>
          </div>
          <div className="border-l-2 border-muted pl-4">
            <div className="mb-1 flex items-center gap-2">
              <Badge variant="outline">v2.0.2</Badge>
              <span className="text-xs text-muted-foreground">2026-06-13</span>
            </div>
            <p className="text-sm font-medium text-muted-foreground">Critical Database Error Fix</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>• Fixed &quot;API error: 500 - OFFER_UPSERT_FAILED&quot;</li>
              <li>• Changed source value: &apos;chrome-extension&apos; → &apos;extension_snapshot&apos;</li>
            </ul>
          </div>
          <div className="border-l-2 border-muted pl-4">
            <div className="mb-1 flex items-center gap-2">
              <Badge variant="outline">v2.0.0</Badge>
              <span className="text-xs text-muted-foreground">2026-06-12</span>
            </div>
            <p className="text-sm font-medium text-muted-foreground">Initial Beta Release</p>
          </div>
        </CardContent>
      </Card>

      {/* Features Grid */}
      <div className="mb-12">
        <h2 className="mb-6 text-center text-2xl font-bold">
          Fitur Unggulan
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <MousePointerClick className="mb-2 h-8 w-8 text-primary" />
              <CardTitle className="text-lg">Satu Klik</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Tombol floating di setiap halaman produk. Klik sekali, data tersimpan otomatis.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="mb-2 h-8 w-8 text-yellow-500" />
              <CardTitle className="text-lg">Super Cepat</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Ekstraksi data dalam 2-3 detik. Notifikasi browser saat berhasil.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="mb-2 h-8 w-8 text-green-500" />
              <CardTitle className="text-lg">Aman & Privat</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Hanya mengirim data produk. Tidak ada tracking browsing history.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <TrendingUp className="mb-2 h-8 w-8 text-blue-500" />
              <CardTitle className="text-lg">Auto-Sync</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Data langsung sinkron ke BijakBeli.app dan muncul di hasil pencarian.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Supported Marketplaces */}
      <Card className="mb-12">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Marketplace yang Didukung</CardTitle>
          <CardDescription>
            Extension otomatis deteksi marketplace dan scrape PDP + search results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Shopee</p>
                <p className="text-sm text-muted-foreground">PDP + search</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Tokopedia</p>
                <p className="text-sm text-muted-foreground">PDP + search</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Lazada</p>
                <p className="text-sm text-muted-foreground">PDP + search</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Blibli</p>
                <p className="text-sm text-muted-foreground">PDP + search</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Bukalapak</p>
                <p className="text-sm text-muted-foreground">PDP + search</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">TikTok Shop</p>
                <p className="text-sm text-muted-foreground">via JSON-LD</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Installation Guide */}
      <div className="mb-12">
        <h2 className="mb-6 text-center text-2xl font-bold">
          Cara Install (5 Menit)
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                1
              </div>
              <CardTitle className="text-lg">Download & Extract</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Download file <code className="rounded bg-muted px-1 py-0.5 text-foreground">.tar.gz</code> di atas
              </p>
              <p className="text-sm text-muted-foreground">
                Extract dengan: <code className="rounded bg-muted px-1 py-0.5 text-foreground">tar -xzf bijakbeli-extension-*.tar.gz</code>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                2
              </div>
              <CardTitle className="text-lg">Load di Chrome</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Buka <code className="rounded bg-muted px-1 py-0.5 text-foreground">chrome://extensions/</code>
              </p>
              <p className="text-sm text-muted-foreground">
                Enable <strong>Developer mode</strong> (toggle kanan atas)
              </p>
              <p className="text-sm text-muted-foreground">
                Klik <strong>&quot;Load unpacked&quot;</strong> → pilih folder <code className="rounded bg-muted px-1 py-0.5 text-foreground">chrome/</code>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                3
              </div>
              <CardTitle className="text-lg">Konfigurasi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Klik icon extension di toolbar Chrome
              </p>
              <p className="text-sm text-muted-foreground">
                Masukkan <strong>Ingestion Secret</strong> yang diberikan admin
              </p>
              <p className="text-sm text-muted-foreground">
                Status akan berubah jadi <strong>Ready</strong>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* How it Works */}
      <Card className="mb-12 border-primary/20">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Cara Kerja Auto-Scrape</CardTitle>
          <CardDescription>
            Browsing biasa = kontribusi otomatis ke database BijakBeli
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                1
              </div>
              <div>
                <p className="font-medium">Browsing seperti biasa</p>
                <p className="text-sm text-muted-foreground">
                  Buka halaman produk di Shopee, Tokopedia, Lazada, Blibli, Bukalapak, atau TikTok Shop
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                2
              </div>
              <div>
                <p className="font-medium">Auto-detect & scrape</p>
                <p className="text-sm text-muted-foreground">
                  Extension otomatis scrape nama, harga, rating, seller, dan kirim ke BijakBeli
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                3
              </div>
              <div>
                <p className="font-medium">Masuk database BijakBeli</p>
                <p className="text-sm text-muted-foreground">
                  Data membantu ribuan pembeli lain mendapat harga terbaik. Cek history di side panel!
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <div className="mb-12">
        <h2 className="mb-6 text-center text-2xl font-bold">
          Pertanyaan Umum
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Apakah extension ini gratis?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Ya, 100% gratis untuk semua pengguna. Tidak ada biaya tersembunyi.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Apakah data saya aman?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Extension hanya mengirim data produk (nama, harga, URL). Tidak ada tracking browsing history atau data pribadi.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Berapa lama proses ekstraksi data?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Hanya 2-3 detik per produk. Anda akan melihat notifikasi browser saat berhasil.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kenapa butuh Ingestion Secret?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Untuk keamanan API. Secret ini mencegah spam dan memastikan hanya pengguna resmi yang bisa mengirim data.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tombol tidak muncul?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Pastikan Anda di halaman produk (bukan search/kategori). Refresh halaman (F5) jika perlu.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ada bug atau error?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Hubungi kami via email atau buka console browser (F12 → Console) untuk melihat error detail.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent text-center">
        <CardHeader>
          <CardTitle className="text-2xl">Siap Membantu BijakBeli?</CardTitle>
          <CardDescription className="text-base">
            Setiap produk yang Anda kumpulkan membantu ribuan pembeli Indonesia mendapatkan harga terbaik!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link href="/downloads/bijakbeli-extension-v3.0.1.tar.gz" download>
            <Button size="lg" className="text-lg">
              <Download className="mr-2 h-5 w-5" />
              Download Extension Sekarang
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground">
            Target: 50+ produk dalam fase beta. Mari kita capai bersama!
          </p>
        </CardContent>
      </Card>

      {/* Footer: Privacy + Source */}
      <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t pt-6 text-sm text-muted-foreground">
        <Link
          href="/extension/privacy-policy"
          className="hover:text-foreground hover:underline"
        >
          <Shield className="mr-1 inline h-3.5 w-3.5" />
          Privacy Policy
        </Link>
        <Link
          href="/extension/faq"
          className="hover:text-foreground hover:underline"
        >
          <HelpCircle className="mr-1 inline h-3.5 w-3.5" />
          FAQ
        </Link>
        <a
          href="https://github.com/afifghaffarr-source/pricehunt-indonesia"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground hover:underline"
        >
          Source Code (GitHub)
        </a>
        <span>v3.0.1 · Manifest V3</span>
      </div>
    </div>
  );
}
