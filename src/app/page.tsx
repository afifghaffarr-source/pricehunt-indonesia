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
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">
              Asisten belanja pintar untuk pembeli Indonesia
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
              Bandingkan harga, cek diskon, dan tahu kapan harus membeli
              <br />
              <span className="text-primary">sebelum checkout</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              PriceHunt membantu membaca pola harga, mendeteksi diskon yang terindikasi mencurigakan, dan memberi saran beli atau tunggu berdasarkan data yang tersedia.
            </p>
            <div className="mt-8">
              <SearchBar size="lg" />
            </div>
            <div className="mt-3">
              <SmartSearchBar />
            </div>
            <div className="mt-4">
              <p className="mb-2 text-sm text-muted-foreground">Populer:</p>
              <PopularSearchChips searches={popularSearches} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeading
          title="Kenapa PriceHunt?"
          subtitle="Kami membantu Anda menemukan harga terbaik tanpa harus buka banyak tab."
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
              <p className="mt-2 text-sm text-muted-foreground">Pasang target harga dan biarkan PriceHunt mengingatkan saat waktunya lebih masuk akal untuk beli.</p>
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
