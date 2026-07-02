import { SmartSearchBar } from "@/components/search/SmartSearchBar";
import { PopularSearchChips } from "@/components/search/PopularSearchChips";
import { ProductCard } from "@/components/product/ProductCard";
import { SectionHeading } from "@/components/common/SectionHeading";
import { getProductsFromDB, getCategoriesFromDB } from "@/lib/supabase/data";
import { popularSearches } from "@/lib/mock-data";
import { AnimatedBackground } from "@/components/hero/AnimatedBackground";
import { HeroMotionScene } from '@/components/hero/HeroMotionScene';
import { InteractivePriceChart } from "@/components/demo/InteractivePriceChart";
import { AnimatedCounter } from "@/components/demo/AnimatedCounter";
import {
  ArrowRight,
  Bell,
  Calculator,
  Search,
  Shield,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Metadata } from "next";
import { JsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo";

export const revalidate = 60;

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

export default async function HomePage() {
  const [allProducts, categories] = await Promise.all([
    getProductsFromDB(),
    getCategoriesFromDB(),
  ]);

  // P0: filter out products with no valid price or no in-stock marketplaces
  // before slicing trending — prevents showing "Rp 0" / "0 marketplace" cards.
  const trendingProducts = allProducts
    .filter((p) => p.lowestPrice > 0 && p.prices.some((pr) => pr.inStock))
    .slice(0, 4);

  return (
    <>
      <JsonLd data={organizationJsonLd()} key="organization" />
      <JsonLd data={websiteJsonLd()} key="website" />
      <div>
      <section className="relative min-h-dvh overflow-hidden">
        <AnimatedBackground />
        
        <div className="container relative z-10 flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-16 lg:flex-row lg:gap-16">
          <HeroMotionScene />
          
          <div className="flex max-w-2xl flex-col gap-6 text-center lg:text-left">
            <Badge className="w-fit self-center lg:self-start" variant="secondary">
              <Sparkles className="mr-1 h-3 w-3" />
              AI-Powered Price Intelligence
            </Badge>
            
            <h1 className="text-balance bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl md:text-6xl">
              Beli yang Tepat, di Waktu yang Tepat
            </h1>
            
            <p className="text-lg text-muted-foreground">
              Bandingkan harga dari 6+ marketplace terpercaya. Temukan deal terbaik dengan AI kami.
            </p>
            
            <div className="w-full">
              <SmartSearchBar />
            </div>
            
            <p className="text-sm text-muted-foreground">
              atau{" "}
              <Link href="/search" className="font-medium text-primary hover:underline">
                cari produk biasa →
              </Link>
            </p>
            
            <div>
              <p className="mb-3 text-sm font-medium text-muted-foreground">Coba cari:</p>
              <PopularSearchChips searches={popularSearches} />
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section className="container px-4 py-16">
        <div className="text-center mb-8">
          <Badge variant="outline" className="mb-4">
            <BarChart3 className="mr-1 h-3 w-3" />
            Contoh Analisis Real-Time
          </Badge>
          <h2 className="text-3xl font-bold sm:text-4xl">
            Lihat Bagaimana AI Kami Menganalisis Harga
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Bukan sekadar daftar harga. BijakBeli menganalisis pola dan memberikan rekomendasi berdasarkan data.
          </p>
        </div>
        
        <Card className="mx-auto max-w-4xl">
          <CardContent className="p-6">
            <div className="mb-4">
              <h3 className="text-2xl font-bold">iPhone 15 Pro Max 256GB</h3>
              <p className="text-muted-foreground">Natural Titanium</p>
            </div>
            
            <InteractivePriceChart
              data={[
                { date: '01 Jun', price: 20500000 },
                { date: '05 Jun', price: 20200000 },
                { date: '10 Jun', price: 19800000 },
                { date: '15 Jun', price: 19500000 },
                { date: '20 Jun', price: 19300000 },
                { date: '25 Jun', price: 18950000 },
                { date: '30 Jun', price: 18850000 },
              ]}
            />
            
            <div className="mt-6 flex flex-col gap-4 border-t pt-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hemat hingga</p>
                <AnimatedCounter end={450000} />
              </div>
              
              <Link
                href="/search"
                className={buttonVariants({ size: 'lg' })}
              >
                Cari Produk Lain
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </CardContent>
        </Card>
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
            {categories.slice(0, 8).map((category) => (
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
          {categories.length > 8 && (
            <div className="mt-6 text-center">
              <Link
                href="/search"
                className="text-sm font-medium text-primary hover:underline"
              >
                Lihat semua kategori →
              </Link>
            </div>
          )}
        </section>
      )}


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
          <details className="group rounded-lg border bg-background p-6 [&_summary::-webkit-details-marker]:hidden overflow-hidden">
            <summary className="flex cursor-pointer items-center justify-between font-semibold">
              Seberapa akurat data harga yang ditampilkan?
              <ChevronDown className="h-5 w-5 transition-transform duration-300 group-open:rotate-180" />
            </summary>
            <p className="mt-4 text-sm text-muted-foreground animate-in fade-in slide-in-from-top-2 duration-300">
              BijakBeli mengumpulkan data harga secara otomatis dari marketplace. Harga dapat berubah sewaktu-waktu, jadi kami sarankan untuk selalu cek harga final di marketplace saat checkout. Data historis kami update berkala untuk analisis yang akurat.
            </p>
          </details>

          <details className="group rounded-lg border bg-background p-6 [&_summary::-webkit-details-marker]:hidden overflow-hidden">
            <summary className="flex cursor-pointer items-center justify-between font-semibold">
              Marketplace mana saja yang didukung?
              <ChevronDown className="h-5 w-5 transition-transform duration-300 group-open:rotate-180" />
            </summary>
            <p className="mt-4 text-sm text-muted-foreground animate-in fade-in slide-in-from-top-2 duration-300">
              BijakBeli mendukung 6 marketplace terbesar di Indonesia: Tokopedia, Shopee, Bukalapak, Lazada, Blibli, dan TikTok Shop. Kami terus menambah coverage marketplace lainnya.
            </p>
          </details>

          <details className="group rounded-lg border bg-background p-6 [&_summary::-webkit-details-marker]:hidden overflow-hidden">
            <summary className="flex cursor-pointer items-center justify-between font-semibold">
              Bagaimana cara kerja deteksi diskon palsu?
              <ChevronDown className="h-5 w-5 transition-transform duration-300 group-open:rotate-180" />
            </summary>
            <p className="mt-4 text-sm text-muted-foreground animate-in fade-in slide-in-from-top-2 duration-300">
              BijakBeli menganalisis riwayat harga produk selama 30-90 hari terakhir. Jika harga &ldquo;original&rdquo; yang dicoret tiba-tiba naik drastis sebelum diskon, atau jika diskon terlihat tidak konsisten dengan pola harga historis, sistem akan menandai sebagai diskon yang terindikasi mencurigakan.
            </p>
          </details>

          <details className="group rounded-lg border bg-background p-6 [&_summary::-webkit-details-marker]:hidden overflow-hidden">
            <summary className="flex cursor-pointer items-center justify-between font-semibold">
              Bagaimana cara kerja price alert?
              <ChevronDown className="h-5 w-5 transition-transform duration-300 group-open:rotate-180" />
            </summary>
            <p className="mt-4 text-sm text-muted-foreground animate-in fade-in slide-in-from-top-2 duration-300">
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
          <p className="mx-auto mt-3 max-w-lg text-primary-foreground">
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
    </>
  );
}
