import { ArrowRight, ExternalLink, TrendingDown } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import { MarketplaceBadge } from "./MarketplaceBadge";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Marketplace } from "@/lib/types";

interface PriceItem {
  marketplace: string;
  price: number;
  url: string;
  inStock: boolean;
}

interface PriceComparisonPreviewProps {
  prices: PriceItem[];
  lowestPrice: number;
  highestPrice: number;
  className?: string;
}

export function PriceComparisonPreview({
  prices,
  lowestPrice,
  highestPrice,
  className = "",
}: PriceComparisonPreviewProps) {
  const inStockPrices = prices.filter((p) => p.inStock);
  
  if (inStockPrices.length === 0) {
    return null;
  }

  const sortedPrices = [...inStockPrices].sort((a, b) => a.price - b.price);
  const priceRange = highestPrice - lowestPrice;
  const hasPriceVariation = priceRange > 0;

  return (
    <div className={className}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Perbandingan Cepat</h3>
          <p className="text-sm text-muted-foreground">
            Geser untuk lihat harga di semua marketplace
          </p>
        </div>
        {hasPriceVariation && (
          <Badge variant="secondary" className="hidden gap-1 sm:flex">
            <TrendingDown className="h-3 w-3" />
            Hemat hingga {formatRupiah(priceRange)}
          </Badge>
        )}
      </div>

      {/* Horizontal Scroll Container */}
      <div className="relative">
        <div className="flex gap-3 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {sortedPrices.map((price, _index) => {
            const isCheapest = price.price === lowestPrice;
            const isMostExpensive = price.price === highestPrice && hasPriceVariation;
            const savingsFromHighest = highestPrice - price.price;
            const percentageDiff = hasPriceVariation 
              ? Math.round(((price.price - lowestPrice) / lowestPrice) * 100)
              : 0;

            return (
              <Card
                key={price.marketplace}
                className={`relative min-w-[200px] flex-shrink-0 snap-center transition-all hover:shadow-md sm:min-w-[220px] ${
                  isCheapest ? "border-green-300 bg-green-50/50 ring-2 ring-green-200 dark:border-green-700 dark:bg-green-950/30 dark:ring-green-800" : ""
                } ${
                  isMostExpensive ? "border-red-200 dark:border-red-800" : ""
                }`}
              >
                {/* Cheapest Badge */}
                {isCheapest && (
                  <div className="absolute -right-1 -top-1">
                    <Badge className="gap-1 bg-green-700 text-white shadow-sm hover:bg-green-700">
                      <TrendingDown className="h-3 w-3" />
                      Termurah
                    </Badge>
                  </div>
                )}

                {/* Most Expensive Badge */}
                {isMostExpensive && !isCheapest && (
                  <div className="absolute -right-1 -top-1">
                    <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/50 dark:text-red-400">
                      Termahal
                    </Badge>
                  </div>
                )}

                <div className="p-4">
                  {/* Marketplace Badge */}
                  <div className="mb-3">
                    <MarketplaceBadge marketplace={price.marketplace as Marketplace} />
                  </div>

                  {/* Price */}
                  <div className="mb-2">
                    <div className={`text-xl font-bold ${isCheapest ? "text-green-700 dark:text-green-400" : "text-foreground"}`}>
                      {formatRupiah(price.price)}
                    </div>
                    
                    {/* Price Difference Indicator */}
                    {!isCheapest && hasPriceVariation && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        +{formatRupiah(price.price - lowestPrice)} ({percentageDiff}%)
                      </div>
                    )}
                    
                    {/* Savings from Highest */}
                    {isCheapest && savingsFromHighest > 0 && (
                      <div className="mt-1 text-xs font-medium text-green-600 dark:text-green-400">
                        Hemat {formatRupiah(savingsFromHighest)}
                      </div>
                    )}
                  </div>

                  {/* Link Button */}
                  <a
                    href={price.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mt-2 flex items-center justify-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      isCheapest
                        ? "bg-green-700 text-white hover:bg-green-800"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    Buka toko
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Scroll Indicators (Mobile) */}
        {sortedPrices.length > 2 && (
          <div className="mt-2 flex items-center justify-center gap-1 sm:hidden">
            {sortedPrices.map((_, index) => (
              <div
                key={index}
                className="h-1 w-1 rounded-full bg-muted-foreground/30"
              />
            ))}
          </div>
        )}
      </div>

      {/* Link to Full Comparison */}
      <div className="mt-4 text-center">
        <a
          href="#prices"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Lihat perbandingan lengkap dengan detail
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
