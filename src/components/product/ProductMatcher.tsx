"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, GitCompare, Loader2 } from "lucide-react";
import { formatRupiah, getMarketplaceColor, getMarketplaceName } from "@/lib/utils";
import { toMarketplace } from "@/lib/vexo/normalizers";
import type { PriceHuntDiscoveredProduct } from "@/lib/vexo/types";

interface ProductMatcherProps {
  productName: string;
  currentMarketplace?: string;
}

interface MatchGroup {
  canonicalTitle: string;
  products: PriceHuntDiscoveredProduct[];
  avgConfidence: number;
}

export function ProductMatcher({ productName, currentMarketplace }: ProductMatcherProps) {
  const [groups, setGroups] = useState<MatchGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchMatches() {
      try {
        const res = await fetch(`/api/vexo/search?q=${encodeURIComponent(productName)}&limit=15`);
        const data = await res.json();

        if (cancelled || !data.results?.length) {
          setLoading(false);
          return;
        }

        await fetch("/api/vexo/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intent: "product-matcher",
            context: data.results
              .slice(0, 8)
              .map((r: PriceHuntDiscoveredProduct) => `${r.normalizedTitle} (${r.marketplace})`)
              .join(" | "),
          }),
        });

        const byMarketplace = new Map<string, PriceHuntDiscoveredProduct[]>();
        for (const product of data.results) {
          if (product.marketplace === currentMarketplace) continue;
          if (product.marketplace === "unknown") continue;
          const existing = byMarketplace.get(product.marketplace) || [];
          existing.push(product);
          byMarketplace.set(product.marketplace, existing);
        }

        const matchGroups: MatchGroup[] = [];
        for (const [, products] of byMarketplace) {
          const best = products.sort((a, b) => b.confidenceScore - a.confidenceScore)[0];
          if (best) {
            matchGroups.push({
              canonicalTitle: best.normalizedTitle,
              products: [best],
              avgConfidence: best.confidenceScore,
            });
          }
        }

        if (!cancelled) {
          setGroups(matchGroups.sort((a, b) => b.avgConfidence - a.avgConfidence));
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    fetchMatches();
    return () => { cancelled = true; };
  }, [productName, currentMarketplace]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 p-4">
          <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
          <span className="text-sm text-muted-foreground">Mencari di marketplace lain...</span>
        </CardContent>
      </Card>
    );
  }

  if (groups.length === 0) return null;

  const visible = expanded ? groups : groups.slice(0, 4);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <GitCompare className="h-4 w-4 text-violet-500" />
          Ditemukan di Marketplace Lain
          <Badge variant="outline" className="ml-auto text-xs border-violet-300 text-violet-600">
            VexoAPI
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {visible.map((group) => {
            const product = group.products[0];
            const mp = toMarketplace(product.marketplace);
            const mpColor = mp ? getMarketplaceColor(mp) : "#6b7280";
            const mpName = mp ? getMarketplaceName(mp) : product.marketplace;

            return (
              <a
                key={product.id}
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: mpColor }}
                  />
                  <div>
                    <p className="text-sm font-medium">{mpName}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {product.normalizedTitle}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {product.estimatedPrice && (
                    <span className="text-sm font-bold text-primary">
                      {formatRupiah(product.estimatedPrice)}
                    </span>
                  )}
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </a>
            );
          })}
        </div>

        {groups.length > 4 && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="mt-3 w-full text-center text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400"
          >
            Lihat {groups.length - 4} marketplace lainnya
          </button>
        )}
      </CardContent>
    </Card>
  );
}
