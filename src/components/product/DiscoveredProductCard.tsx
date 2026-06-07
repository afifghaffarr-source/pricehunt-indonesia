import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Star } from "lucide-react";
import { cn, formatRupiah, getMarketplaceColor, getMarketplaceName } from "@/lib/utils";
import type { PriceHuntDiscoveredProduct } from "@/lib/vexo/types";
import { toMarketplace } from "@/lib/vexo/normalizers";

interface DiscoveredProductCardProps {
  product: PriceHuntDiscoveredProduct;
}

export function DiscoveredProductCard({ product }: DiscoveredProductCardProps) {
  const mp = toMarketplace(product.marketplace);
  const mpColor = mp ? getMarketplaceColor(mp) : "#6b7280";
  const mpName = mp ? getMarketplaceName(mp) : product.marketplace;

  const confidencePercent = Math.round(product.confidenceScore * 100);
  const confidenceColor =
    confidencePercent >= 80 ? "text-green-600" :
    confidencePercent >= 60 ? "text-amber-600" : "text-muted-foreground";

  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
    >
      <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5">
        <CardContent className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: mpColor }}
            />
            <span className="text-xs font-medium" style={{ color: mpColor }}>
              {mpName}
            </span>
            <Badge variant="outline" className="ml-auto text-[10px] border-violet-300 text-violet-600">
              discovered
            </Badge>
          </div>

          <h3 className="mb-2 line-clamp-2 text-sm font-semibold group-hover:text-primary transition-colors">
            {product.normalizedTitle}
          </h3>

          {product.estimatedPrice && (
            <p className="mb-1 text-lg font-bold text-primary">
              {formatRupiah(product.estimatedPrice)}
            </p>
          )}

          {product.snippet && (
            <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">
              {product.snippet}
            </p>
          )}

          <div className="flex items-center justify-between">
            <span className={cn("text-xs font-medium", confidenceColor)}>
              <Star className="mr-0.5 inline h-3 w-3" />
              {confidencePercent}% match
            </span>
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </a>
  );
}
