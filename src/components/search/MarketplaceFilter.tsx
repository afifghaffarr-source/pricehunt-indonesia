"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getMarketplaceColor, getMarketplaceName } from "@/lib/utils";
import type { Marketplace } from "@/lib/types";

interface MarketplaceFilterProps {
  selected: Marketplace[];
  onChange: (selected: Marketplace[]) => void;
  className?: string;
}

const allMarketplaces: Marketplace[] = [
  "tokopedia", "shopee", "bukalapak", "lazada", "blibli", "tiktok",
];

export function MarketplaceFilter({
  selected,
  onChange,
  className,
}: MarketplaceFilterProps) {
  const toggle = (mp: Marketplace) => {
    if (selected.includes(mp)) {
      onChange(selected.filter((m) => m !== mp));
    } else {
      onChange([...selected, mp]);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <span className="text-sm text-muted-foreground">Marketplace</span>
      <div className="flex flex-wrap gap-2">
        {allMarketplaces.map((mp) => {
          const isActive = selected.includes(mp);
          const color = getMarketplaceColor(mp);
          return (
            <Badge
              key={mp}
              variant={isActive ? "default" : "outline"}
              className="cursor-pointer transition-colors"
              style={
                isActive
                  ? { backgroundColor: color, borderColor: color }
                  : { borderColor: color, color }
              }
              onClick={() => toggle(mp)}
            >
              {getMarketplaceName(mp)}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
