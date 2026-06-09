import Link from "next/link";
import { ExternalLink, Store, CheckCircle2, TrendingDown } from "lucide-react";
import { formatRupiah, getMarketplaceName } from "@/lib/utils";
import { MarketplaceBadge } from "./MarketplaceBadge";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Marketplace } from "@/lib/types";

interface OfferItem {
  marketplace: string;
  price: number;
  url: string;
  inStock: boolean;
  isOfficialStore?: boolean;
}

interface BestOfferCardProps {
  offers: OfferItem[];
  lowestPrice: number;
  className?: string;
}

export function BestOfferCard({ offers, lowestPrice, className = "" }: BestOfferCardProps) {
  // Get top 3 in-stock offers sorted by price
  const topOffers = offers
    .filter((offer) => offer.inStock)
    .sort((a, b) => a.price - b.price)
    .slice(0, 3);

  if (topOffers.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center">
          <Store className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Produk sedang tidak tersedia di marketplace
          </p>
        </div>
      </Card>
    );
  }

  const calculateSavings = (price: number) => {
    if (price === lowestPrice) return 0;
    return price - lowestPrice;
  };

  return (
    <div className={className}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">Penawaran Terbaik</h2>
        <Badge variant="secondary" className="gap-1">
          <Store className="h-3 w-3" />
          {topOffers.length} toko tersedia
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {topOffers.map((offer, index) => {
          const savings = calculateSavings(offer.price);
          const isCheapest = offer.price === lowestPrice;

          return (
            <Card
              key={offer.marketplace}
              className={`relative overflow-hidden p-4 transition-all hover:shadow-md ${
                isCheapest ? "border-primary/50 ring-2 ring-primary/20" : ""
              }`}
            >
              {isCheapest && (
                <div className="absolute right-0 top-0">
                  <div className="flex items-center gap-1 rounded-bl-lg bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
                    <TrendingDown className="h-3 w-3" />
                    Termurah
                  </div>
                </div>
              )}

              <div className="mb-3 flex items-center justify-between">
                <MarketplaceBadge marketplace={offer.marketplace as Marketplace} />
                {offer.isOfficialStore && (
                  <Badge variant="outline" className="gap-1 text-[10px]">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    Official
                  </Badge>
                )}
              </div>

              <div className="mb-3">
                <div className="text-2xl font-bold text-primary">
                  {formatRupiah(offer.price)}
                </div>
                {!isCheapest && savings > 0 && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    +{formatRupiah(savings)} dari termurah
                  </div>
                )}
              </div>

              <Link
                href={offer.url}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ 
                  size: "sm", 
                  variant: isCheapest ? "default" : "outline",
                  className: "w-full gap-1.5"
                })}
              >
                Buka toko
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Card>
          );
        })}
      </div>

      {offers.filter((o) => o.inStock).length > 3 && (
        <div className="mt-3 text-center">
          <a
            href="#prices"
            className="text-sm text-primary hover:underline"
          >
            Lihat {offers.filter((o) => o.inStock).length - 3} toko lainnya →
          </a>
        </div>
      )}
    </div>
  );
}
