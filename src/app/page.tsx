import { SearchBar } from "@/components/search/SearchBar";
import { SmartSearchBar } from "@/components/search/SmartSearchBar";
import { PopularSearchChips } from "@/components/search/PopularSearchChips";
import { ProductCard } from "@/components/product/ProductCard";
import { SectionHeading } from "@/components/common/SectionHeading";
import { getProductsFromDB, getCategoriesFromDB } from "@/lib/supabase/data";
import { popularSearches } from "@/lib/mock-data";
import {
  ArrowRight,
  Bell,
  Calculator,
  Search,
  TrendingDown,
  Shield,
  Zap,
  Sparkles,
  BarChart3,
  Download,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const revalidate = 60;

export default async function HomePage() {
  const [allProducts, categories] = await Promise.all([
    getProductsFromDB(),
    getCategoriesFromDB(),
  ]);

  const trendingProducts = allProducts.slice(0, 4);

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50 via-background to-background dark:from-emerald-950/20">
        {/* Animated gradient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 -top-20 h-96 w-96 animate-blob rounded-full bg-emerald-300/30 opacity-70 blur-3xl mix-blend-multiply dark:bg-emerald-500/20" />
          <div className="animation-delay-2000 absolute -right-20 -top-20 h-96 w-96 animate-blob rounded-full bg-green-300/30 opacity-70 blur-3xl mix-blend-multiply dark:bg-green-500/20" />
          <div className="animation-delay-4000 absolute -bottom-20 left-1/2 h-96 w-96 animate-blob rounded-full bg-emerald-300/30 opacity-70 blur-3xl mix-blend-multiply dark:bg-emerald-500/20" />
        </div>
        
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-6 text-sm animate-bounce">
              Asisten belanja pintar untuk pembeli Indonesia
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Temukan harga terbaik,
              <br />
              deteksi diskon palsu,
              <br />
              <span className="bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-600 bg-clip-text text-transparent animate-gradient">
                beli di waktu yang tepat
              </span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
              BijakBeli menganalisis harga dari 6 marketplace Indonesia, mendeteksi diskon mencurigakan, dan memberi rekomendasi kapan waktu terbaik membeli berdasarkan data historis.
            </p>
            <div className="mt-10">
              <SearchBar size="lg" />
            </div>
            <div className="mt-4">
              <SmartSearchBar />
            </div>
            <div className="mt-6">
              <p className="mb-3 text-sm font-medium text-muted-foreground">Coba cari:</p>
              <PopularSearchChips searches={popularSearches} />
            </div>

            {/* Trust Signals */}
            <div className="mt-12 flex flex-col items-center gap-6 border-t pt-8">
              <p className="text-sm font-medium text-muted-foreground">
                Membandingkan harga dari marketplace terpercaya:
              </p>
              <div className="flex flex-wrap items-center justify-center gap-6 opacity-60 grayscale transition-all hover:opacity-100 hover:grayscale-0">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <div className="h-8 w-8 rounded bg-orange-500/10 flex items-center justify-center">
                    <span className="text-orange-600">S</span>
                  </div>
                  Shopee
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <div className="h-8 w-8 rounded bg-green-500/10 flex items-center justify-center">
                    <span className="text-green-600">T</span>
                  </div>
                  Tokopedia
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <div className="h-8 w-8 rounded bg-blue-500/10 flex items-center justify-center">
                    <span className="text-blue-600">B</span>
                  </div>
                  Blibli
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <div className="h-8 w-8 rounded bg-red-500/10 flex items-center justify-center">
                    <span className="text-red-600">L</span>
                  </div>
                  Lazada
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <div className="h-8 w-8 rounded bg-yellow-500/10 flex items-center justify-center">
                    <span className="text-yellow-600">B</span>
                  </div>
                  Bukalapak
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <div className="h-8 w-8 rounded bg-purple-500/10 flex items-center justify-center">
                    <span className="text-purple-600">JD</span>
                  </div>
                  JD.ID
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Intelligence Preview - Show, don't just tell */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background via-muted/30 to-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="outline" className="mb-4">
              <Zap className="mr-1 h-3 w-3" />
              Intelligence in Action
            </Badge>
            <h2 className="text-3xl font-bold sm:text-4xl">
              Lihat BijakBeli Bekerja
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Bukan sekadar daftar harga. BijakBeli menganalisis pola, mendeteksi anomali, dan memberi rekomendasi berdasarkan data.
            </p>
          </div>

          {/* Example Intelligence Dashboard */}
          <div className="mt-12 rounded-2xl border-2 bg-background p-6 shadow-md sm:p-8">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">iPhone 15 Pro Max 256GB</h3>
                <p className="text-sm text-muted-foreground">Contoh analisis real-time</p>
              </div>
              <Badge className="bg-green-600 text-white">
                Deal Score: 87/100
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {/* Buy or Wait Recommendation */}
              <Card className="group border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 transition-all duration-300 hover:shadow-md hover:scale-[1.01] dark:from-green-950/20 dark:to-emerald-950/20">
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="rounded-full bg-green-600 p-1 transition-transform group-hover:scale-[1.02]">
                      <TrendingDown className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                      Beli Sekarang
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Harga 8% di bawah median 30 hari. Diskon terlihat wajar.
                  </p>
                </CardContent>
              </Card>

              {/* Fake Discount Check */}
              <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="rounded-full bg-emerald-600 p-1">
                      <Shield className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                      Diskon Asli
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Harga ori konsisten dengan riwayat. Confidence: 92%
                  </p>
                </CardContent>
              </Card>

              {/* Price Comparison */}
              <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20">
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="rounded-full bg-blue-600 p-1">
                      <Search className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                      6 Toko
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Hemat Rp 450.000 vs toko termahal
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Harga termurah</span>
                <span className="font-bold">Rp 18.999.000</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Median 30 hari</span>
                <span className="text-muted-foreground line-through">Rp 20.650.000</span>
              </div>
            </div>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              Analisis ini update otomatis setiap produk yang Anda cari
            </p>
          </div>
        </div>
      </section>

      {/* How It Works - Phase D */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="mr-1 h-3 w-3" />
            3 Langkah Mudah
          </Badge>
          <h2 className="text-3xl font-bold sm:text-4xl">Cara Kerja BijakBeli</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Dari pencarian hingga keputusan, semua dalam hitungan detik
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {/* Step 1 */}
          <div className="relative">
            <div className="flex flex-col items-center text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-2xl font-bold text-white shadow-lg">
                1
              </div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                <Search className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Cari Produk</h3>
              <p className="text-sm text-muted-foreground">
                Ketik nama produk atau paste link dari marketplace favorit Anda
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative">
            <div className="flex flex-col items-center text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 text-2xl font-bold text-white shadow-lg">
                2
              </div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                <BarChart3 className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Analisis Otomatis</h3>
              <p className="text-sm text-muted-foreground">
                BijakBeli membandingkan harga, menghitung deal score, dan deteksi diskon palsu
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative">
            <div className="flex flex-col items-center text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-2xl font-bold text-white shadow-lg">
                3
              </div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10">
                <CheckCircle2 className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Terima Rekomendasi</h3>
              <p className="text-sm text-muted-foreground">
                Dapatkan saran beli sekarang atau tunggu berdasarkan analisis data historis
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeading
          title="Belanja Cerdas Dimulai dari Sini"
          subtitle="Fitur yang membantu Anda mengambil keputusan lebih baik"
          align="center"
        />
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardContent className="flex flex-col items-center p-6 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 font-semibold">Bandingkan tanpa buka banyak tab</h3>
              <p className="text-sm text-muted-foreground">
                Lihat harga dari 6 marketplace sekaligus. Tidak perlu buka satu
                per satu.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center p-6 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <TrendingDown className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="mb-2 font-semibold">Pantau harga incaran</h3>
              <p className="text-sm text-muted-foreground">
                Lihat grafik riwayat harga 30 hari untuk tahu waktu terbaik
                membeli.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center p-6 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10">
                <Zap className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="mb-2 font-semibold">Rekomendasi beli atau tunggu</h3>
              <p className="text-sm text-muted-foreground">
                Rekomendasi cerdas kapan waktu terbaik untuk membeli produk
                incaran Anda.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {trendingProducts.length > 0 && (
        <section className="bg-muted/50">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <SectionHeading
                title="Deal Terbaik Hari Ini"
                subtitle="Produk dengan skor harga tertinggi dari database."
              />
              <Link
                href="/search"
                className={buttonVariants({ variant: "ghost" }) + " hidden sm:flex"}
              >
                Lihat Semua
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {trendingProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="border-amber-200 bg-amber-50/60 dark:bg-amber-950/20">
            <CardContent className="p-6">
              <Shield className="mb-4 h-7 w-7 text-amber-600" />
              <h3 className="font-semibold">Deteksi diskon palsu</h3>
              <p className="mt-2 text-sm text-muted-foreground">Lihat apakah potongan harga terlihat wajar berdasarkan riwayat harga yang tersedia.</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20">
            <CardContent className="p-6">
              <Bell className="mb-4 h-7 w-7 text-emerald-600" />
              <h3 className="font-semibold">Alert saat harga masuk target</h3>
              <p className="mt-2 text-sm text-muted-foreground">Pasang target harga dan biarkan BijakBeli mengingatkan saat waktunya lebih masuk akal untuk beli.</p>
            </CardContent>
          </Card>
          <Card className="border-sky-200 bg-sky-50/60 dark:bg-sky-950/20">
            <CardContent className="p-6">
              <Calculator className="mb-4 h-7 w-7 text-sky-600" />
              <h3 className="font-semibold">Hitung total bayar real</h3>
              <p className="mt-2 text-sm text-muted-foreground">Harga barang murah belum tentu total checkout paling rendah setelah ongkir, voucher, dan cashback.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <SectionHeading
            title="Jelajahi Kategori"
            subtitle="Temukan produk berdasarkan kategori."
            align="center"
          />
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category}
                href={`/search?category=${encodeURIComponent(category)}`}
              >
                <Card className="transition-all hover:shadow-md hover:-translate-y-0.5">
                  <CardContent className="flex items-center justify-center p-4">
                    <span className="text-sm font-medium">{category}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Extension CTA - Phase D */}
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-background to-blue-50 dark:from-purple-950/20 dark:via-background dark:to-blue-950/20">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <Badge variant="secondary" className="mb-4">
                <Download className="mr-1 h-3 w-3" />
                Browser Extension
              </Badge>
              <h2 className="text-3xl font-bold sm:text-4xl">
                Perbandingan Harga Langsung di Marketplace
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Install extension BijakBeli dan lihat perbandingan harga otomatis saat Anda browsing di Tokopedia, Shopee, atau marketplace lainnya.
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Otomatis deteksi produk yang sedang Anda lihat</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Tampilkan harga dari 6 marketplace dalam satu sidebar</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Alert diskon palsu dan rekomendasi beli/tunggu</span>
                </li>
              </ul>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/extension"
                  className={buttonVariants({ size: "lg" })}
                >
                  <Download className="mr-2 h-5 w-5" />
                  Download Extension
                </Link>
                <Link
                  href="/extension"
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                >
                  Pelajari Lebih Lanjut
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="rounded-2xl border-2 bg-gradient-to-br from-white to-gray-50 p-8 shadow-lg dark:from-gray-900 dark:to-gray-800">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-blue-500">
                    <Download className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold">BijakBeli Extension</div>
                    <div className="text-xs text-muted-foreground">Chrome • Edge • Brave</div>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="rounded-lg border bg-background/50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant="secondary" className="bg-green-500/10 text-green-700">
                        Active
                      </Badge>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-background/50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Marketplace Detected</span>
                      <span className="font-medium">Tokopedia</span>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-background/50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Prices Found</span>
                      <span className="font-medium">6 toko</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section - Phase D */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">FAQ</Badge>
          <h2 className="text-3xl font-bold sm:text-4xl">Pertanyaan Umum</h2>
          <p className="mt-3 text-muted-foreground">
            Hal yang sering ditanyakan tentang BijakBeli
          </p>
        </div>

        <div className="space-y-4">
          <details className="group rounded-lg border bg-background p-6 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between font-semibold">
              Apakah BijakBeli gratis?
              <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-4 text-sm text-muted-foreground">
              Ya, BijakBeli sepenuhnya gratis untuk digunakan. Anda dapat membandingkan harga, mendapatkan alert, dan mengakses semua fitur intelligence tanpa biaya apapun.
            </p>
          </details>

          <details className="group rounded-lg border bg-background p-6 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between font-semibold">
              Seberapa akurat data harga yang ditampilkan?
              <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-4 text-sm text-muted-foreground">
              BijakBeli mengumpulkan data harga secara otomatis dari marketplace. Harga dapat berubah sewaktu-waktu, jadi kami sarankan untuk selalu cek harga final di marketplace saat checkout. Data historis kami update berkala untuk analisis yang akurat.
            </p>
          </details>

          <details className="group rounded-lg border bg-background p-6 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between font-semibold">
              Marketplace mana saja yang didukung?
              <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-4 text-sm text-muted-foreground">
              BijakBeli mendukung 6 marketplace terbesar di Indonesia: Tokopedia, Shopee, Bukalapak, Lazada, Blibli, dan JD.ID. Kami terus menambah coverage marketplace lainnya.
            </p>
          </details>

          <details className="group rounded-lg border bg-background p-6 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between font-semibold">
              Bagaimana cara kerja deteksi diskon palsu?
              <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-4 text-sm text-muted-foreground">
              BijakBeli menganalisis riwayat harga produk selama 30-90 hari terakhir. Jika harga &ldquo;original&rdquo; yang dicoret tiba-tiba naik drastis sebelum diskon, atau jika diskon terlihat tidak konsisten dengan pola harga historis, sistem akan menandai sebagai diskon yang terindikasi mencurigakan.
            </p>
          </details>

          <details className="group rounded-lg border bg-background p-6 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between font-semibold">
              Apakah data saya aman?
              <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-4 text-sm text-muted-foreground">
              Ya. BijakBeli tidak menyimpan informasi pembayaran atau data sensitif Anda. Kami hanya menyimpan wishlist, price alert, dan preferensi yang Anda set. Data Anda dilindungi dan tidak dibagikan kepada pihak ketiga.
            </p>
          </details>

          <details className="group rounded-lg border bg-background p-6 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between font-semibold">
              Bagaimana cara kerja price alert?
              <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-4 text-sm text-muted-foreground">
              Setelah Anda set target harga untuk suatu produk, BijakBeli akan memantau harga secara otomatis. Saat harga mencapai atau di bawah target Anda, kami akan mengirim notifikasi via email atau push notification (jika diaktifkan).
            </p>
          </details>
        </div>
      </section>

      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <Shield className="mx-auto mb-4 h-10 w-10 opacity-80" />
          <h2 className="text-2xl font-bold sm:text-3xl">
            Belanja Cerdas, Hemat Waktu & Uang
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-primary-foreground/80">
            Dirancang untuk membantu pembeli Indonesia membandingkan harga dengan lebih cerdas, jujur, dan berbasis data.
          </p>
          <Link
            href="/search"
            className={buttonVariants({ variant: "secondary", size: "lg" }) + " mt-6"}
          >
            Mulai Cari Sekarang
          </Link>
        </div>
      </section>
    </div>
  );
}
