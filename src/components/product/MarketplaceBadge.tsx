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
        // Use foreground (always dark) for text — marketplace brand color
        // (e.g. Tokopedia #42B549) only has 2.6:1 contrast on white, which
        // fails WCAG 2.1 AA. The border keeps the brand identity.
        color: undefined,
      }}
    >
      {name}
    </Badge>
  );
}
