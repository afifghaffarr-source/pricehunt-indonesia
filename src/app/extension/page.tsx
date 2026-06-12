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
  Sparkles,
  MousePointerClick
} from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Chrome Extension - BijakBeli.app",
  description: "Download ekstensi Chrome BijakBeli untuk mengumpulkan data produk dengan satu klik dari Tokopedia, Shopee, dan Bukalapak.",
};

export default function ExtensionPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="mb-12 text-center">
        <Badge variant="secondary" className="mb-4 border-primary/20">
          🚀 Beta v2.0.2
        </Badge>
        <h1 className="mb-4 text-4xl font-bold tracking-tight">
          BijakBeli Chrome Extension
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Kumpulkan data produk dari marketplace favorit dengan satu klik.
          Bantu kami membangun database harga terlengkap di Indonesia! 🇮🇩
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
            Versi Beta - Gratis untuk semua pengguna
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link href="/downloads/bijakbeli-extension-v2.0.2-beta.tar.gz" download>
            <Button size="lg" className="w-full text-lg">
              <Download className="mr-2 h-5 w-5" />
              Download Extension (14 KB)
            </Button>
          </Link>
          <p className="text-center text-sm text-muted-foreground">
            SHA256: <code className="text-xs">1d5f620d...efb926</code>
          </p>
        </CardContent>
      </Card>

      {/* Beta Secret Card */}
      <Card className="mx-auto mb-12 max-w-2xl border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
            <Shield className="h-6 w-6 text-amber-600" />
          </div>
          <CardTitle className="text-xl">Beta Testing Secret</CardTitle>
          <CardDescription>
            Ingestion secret untuk beta testers - simpan baik-baik!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <p className="mb-2 text-sm font-medium">Ingestion Secret:</p>
            <code className="block break-all rounded bg-background p-3 text-xs font-mono">
              8f38f6acaafb1d3f5dc0e2f60f07e7e731ca67c4ed15b9dee7ff8094ec9eebc0
            </code>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              📋 <strong>Cara pakai:</strong> Copy secret di atas, paste di popup extension saat konfigurasi (Step 3)
            </p>
            <p>
              🔒 <strong>Keamanan:</strong> Secret ini hanya untuk beta testers. Jangan share di public!
            </p>
            <p className="text-xs">
              ⚠️ Secret ini akan diganti saat launch publik ke Chrome Web Store
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Changelog Card */}
      <Card className="mx-auto mb-12 max-w-2xl border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
        <CardHeader>
          <CardTitle className="text-lg">📝 Changelog</CardTitle>
          <CardDescription>Update terbaru extension</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="border-l-2 border-red-500 pl-4">
            <div className="mb-1 flex items-center gap-2">
              <Badge variant="default" className="bg-red-500">v2.0.2</Badge>
              <span className="text-xs text-muted-foreground">2026-06-13 (Latest)</span>
            </div>
            <p className="text-sm font-medium text-foreground">🐛 Critical Database Error Fix</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>• Fixed "API error: 500 - OFFER_UPSERT_FAILED"</li>
              <li>• Changed source value: 'chrome-extension' → 'extension_snapshot'</li>
              <li>• Database CHECK constraint now accepts the correct value</li>
            </ul>
            <p className="mt-2 text-xs text-red-600">
              ⚠️ <strong>Wajib update!</strong> Versi 2.0.1 tidak bisa save data ke database.
            </p>
          </div>
          <div className="border-l-2 border-muted pl-4">
            <div className="mb-1 flex items-center gap-2">
              <Badge variant="outline">v2.0.1</Badge>
              <span className="text-xs text-muted-foreground">2026-06-12</span>
            </div>
            <p className="text-sm font-medium text-muted-foreground">🐛 Critical Bug Fix</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>• Fixed "Failed to fetch" error saat klik button</li>
              <li>• Manifest V3 CORS issue resolved via message passing</li>
              <li>• API calls sekarang via background worker (lebih stabil)</li>
            </ul>
          </div>
          <div className="border-l-2 border-muted pl-4">
            <div className="mb-1 flex items-center gap-2">
              <Badge variant="outline">v2.0.0</Badge>
              <span className="text-xs text-muted-foreground">2026-06-12</span>
            </div>
            <p className="text-sm font-medium text-muted-foreground">🚀 Initial Beta Release</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>• Support Tokopedia, Shopee, Bukalapak</li>
              <li>• One-click data collection</li>
              <li>• Auto-sync to BijakBeli database</li>
            </ul>
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
            Extension otomatis mendeteksi marketplace dan mengekstrak data produk
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Tokopedia</p>
                <p className="text-sm text-muted-foreground">Semua produk</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Shopee</p>
                <p className="text-sm text-muted-foreground">Semua produk</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Bukalapak</p>
                <p className="text-sm text-muted-foreground">Semua produk</p>
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
                Download file <code className="rounded bg-muted px-1 py-0.5">.tar.gz</code> di atas
              </p>
              <p className="text-sm text-muted-foreground">
                Extract dengan: <code className="rounded bg-muted px-1 py-0.5">tar -xzf bijakbeli-extension-*.tar.gz</code>
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
                Buka <code className="rounded bg-muted px-1 py-0.5">chrome://extensions/</code>
              </p>
              <p className="text-sm text-muted-foreground">
                Enable <strong>Developer mode</strong> (toggle kanan atas)
              </p>
              <p className="text-sm text-muted-foreground">
                Klik <strong>"Load unpacked"</strong> → pilih folder <code className="rounded bg-muted px-1 py-0.5">chrome/</code>
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
                Klik icon extension 📦 di toolbar Chrome
              </p>
              <p className="text-sm text-muted-foreground">
                Masukkan <strong>Ingestion Secret</strong> yang diberikan admin
              </p>
              <p className="text-sm text-muted-foreground">
                Status akan berubah jadi <strong>✅ Ready</strong>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* How it Works */}
      <Card className="mb-12 border-primary/20">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Cara Menggunakan</CardTitle>
          <CardDescription>
            Sangat mudah, bahkan untuk pemula sekalipun!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                1
              </div>
              <div>
                <p className="font-medium">Buka halaman produk</p>
                <p className="text-sm text-muted-foreground">
                  Kunjungi produk apa saja di Tokopedia, Shopee, atau Bukalapak
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                2
              </div>
              <div>
                <p className="font-medium">Klik tombol floating</p>
                <p className="text-sm text-muted-foreground">
                  Tombol <strong>📦 Add to BijakBeli</strong> muncul di pojok kanan bawah
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                3
              </div>
              <div>
                <p className="font-medium">Selesai!</p>
                <p className="text-sm text-muted-foreground">
                  Tombol berubah jadi <strong>✅ Saved!</strong> dan notifikasi muncul. Data sudah masuk database!
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
          <Link href="/downloads/bijakbeli-extension-v2.0.0-beta.tar.gz" download>
            <Button size="lg" className="text-lg">
              <Download className="mr-2 h-5 w-5" />
              Download Extension Sekarang
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground">
            Target: 50+ produk dalam fase beta. Mari kita capai bersama! 🚀
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
