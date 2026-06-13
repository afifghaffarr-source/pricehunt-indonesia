import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Sparkles, TrendingDown, ShoppingBag, Star } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { formatRupiah } from "@/lib/utils";
import { calculateDealScore } from "@/lib/deal-score";

export const metadata = {
  title: "Promo Pintar - BijakBeli.app",
  description: "Temukan produk dengan deal terbaik, harga termurah, dan rekomendasi pintar.",
};

export default async function DealsPage() {
  const supabase = await createClient();

  // Fetch products sorted by lowest price and with price history
  const { data: products } = await supabase
    .from("products")
    .select(
      `
      id,
      name,
      slug,
      image_url,
      lowest_price,
      category,
      prices (
        id,
        price,
        marketplace_id,
        marketplaces (
          name
        )
      )
    `
    )
    .not("lowest_price", "is", null)
    .order("lowest_price", { ascending: true })
    .limit(24);

  // Calculate deal scores for products
  const productsWithScores = (products || []).map((product) => {
    // Simple deal score calculation for now
    // In production, this should use real historical data
    const score = calculateDealScore({
      currentPrice: product.lowest_price || 0,
      median30Day: product.lowest_price ? product.lowest_price * 1.15 : 0,
      median90Day: product.lowest_price ? product.lowest_price * 1.2 : 0,
      lowestHistoricalPrice: product.lowest_price || 0,
      sellerRating: 4.0,
      isOfficialStore: false,
      stockStatus: 'in_stock',
    });

    return {
      ...product,
      dealScore: score.score,
      dealLabel: score.label,
    };
  });

  // Sort by deal score (highest first)
  const sortedProducts = productsWithScores.sort(
    (a, b) => b.dealScore - a.dealScore
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Sparkles className="h-6 w-6 text-yellow-500" />
          Promo Pintar
        </h1>
        <p className="text-muted-foreground">
          Produk dengan deal terbaik, harga termurah, dan rekomendasi pintar berdasarkan
          analisis data real-time.
        </p>
      </div>

      {/* Stats Section */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/20">
                <Sparkles className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Deal Terbaik</p>
                <p className="text-2xl font-bold">{sortedProducts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/20">
                <TrendingDown className="h-5 w-5 text-green-600 dark:text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Harga Turun</p>
                <p className="text-2xl font-bold">
                  {sortedProducts.filter((p) => p.dealScore >= 75).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20">
                <Star className="h-5 w-5 text-blue-600 dark:text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rekomendasi</p>
                <p className="text-2xl font-bold">
                  {sortedProducts.filter((p) => p.dealScore >= 85).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products Grid */}
      {sortedProducts.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedProducts.map((product) => {
            const prices = product.prices as unknown as Array<{
              price: number;
              marketplaces: { name: string };
            }>;
            const marketplaceCount = prices?.length || 0;

            return (
              <Card
                key={product.id}
                className="overflow-hidden transition-shadow hover:shadow-lg"
              >
                <Link href={`/product/${product.slug}`}>
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform hover:scale-[1.01]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ShoppingBag className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    
                    {/* Deal Score Badge */}
                    <div className="absolute left-2 top-2">
                      <Badge
                        className={
                          product.dealScore >= 85
                            ? "bg-green-500 hover:bg-green-600"
                            : product.dealScore >= 75
                            ? "bg-blue-500 hover:bg-blue-600"
                            : "bg-gray-500 hover:bg-gray-600"
                        }
                      >
                        {product.dealLabel}
                      </Badge>
                    </div>

                    {/* Deal Score Number */}
                    <div className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs font-bold text-white">
                      {product.dealScore}/100
                    </div>
                  </div>
                </Link>

                <CardContent className="p-4">
                  <Link href={`/product/${product.slug}`}>
                    <h3 className="mb-2 line-clamp-2 text-sm font-semibold hover:text-primary">
                      {product.name}
                    </h3>
                  </Link>

                  <div className="mb-3 flex items-baseline gap-2">
                    <p className="text-xl font-bold text-primary">
                      {formatRupiah(product.lowest_price || 0)}
                    </p>
                  </div>

                  <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <ShoppingBag className="h-3 w-3" />
                    <span>
                      {marketplaceCount} {marketplaceCount === 1 ? "toko" : "toko"}
                    </span>
                    {product.category && (
                      <>
                        <span>•</span>
                        <span className="line-clamp-1">{product.category}</span>
                      </>
                    )}
                  </div>

                  <Link
                    href={`/product/${product.slug}`}
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                      className: "w-full",
                    })}
                  >
                    <Sparkles className="mr-1 h-3 w-3" />
                    Lihat Deal
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Sparkles className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">Belum Ada Deal Tersedia</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Deals dan promo akan muncul di sini saat tersedia.
            </p>
            <Link
              href="/search"
              className={buttonVariants({ variant: "default" })}
            >
              Cari Produk
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
