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
        <Badge variant="secondary" className="mb-4">
          <Sparkles className="mr-1 h-3 w-3" />
          Beta v2.0.0
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
          <Link href="/downloads/bijakbeli-extension-v2.0.0-beta.tar.gz" download>
            <Button size="lg" className="w-full text-lg">
              <Download className="mr-2 h-5 w-5" />
              Download Extension (14 KB)
            </Button>
          </Link>
          <p className="text-center text-sm text-muted-foreground">
            SHA256: <code className="text-xs">97ef056...c614ea</code>
          </p>
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
