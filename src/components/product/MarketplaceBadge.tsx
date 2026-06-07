import { Badge } from "@/components/ui/badge";
import { getMarketplaceName, getMarketplaceColor } from "@/lib/utils";
import type { Marketplace } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MarketplaceBadgeProps {
  marketplace: Marketplace;
  className?: string;
}

export function MarketplaceBadge({
  marketplace,
  className,
}: MarketplaceBadgeProps) {
  const name = getMarketplaceName(marketplace);
  const color = getMarketplaceColor(marketplace);

  return (
    <Badge
      variant="outline"
      className={cn("font-medium", className)}
      style={{
        borderColor: color,
        color: color,
      }}
    >
      {name}
    </Badge>
  );
}
