/**
 * Phase 7 — Per-variant price stats card list.
 *
 * Renders one row per variant with min/max price range + offer count.
 * The cheapest variant (lowest minPrice) is highlighted as the winner so
 * the user can scan the page and immediately see "ah, 256GB is the best
 * deal at the moment".
 *
 * Server component — receives already-aggregated data. No client state,
 * no fetch, no useEffect. The parent page owns the data fetch and passes
 * the rows in. This keeps the component pure and trivially testable.
 *
 * Sort order:
 *   1. Variants with offers first, sorted by minPrice ascending (cheapest
 *      wins — that's the question a price-comparison user is asking).
 *   2. Variants with zero offers sink to the bottom in their input order
 *      so they don't disrupt the scan.
 *
 * Variant label strategy:
 *   The page passes pre-formatted labels (e.g. "256GB" or "256GB ·
 *   Midnight") because the component doesn't know about variant taxonomy
 *   (storage vs color vs connectivity). Keeping the labelling in the
 *   page avoids leaking `ProductVariant` shape into this view.
 */
import Link from "next/link";
import { TrendingDown, TrendingUp, Package, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRupiah } from "@/lib/utils";
import type { VariantPriceStats } from "@/lib/supabase/prices";

export interface VariantPriceStatsRow extends VariantPriceStats {
  /** Pre-formatted label like "256GB" or "256GB · Midnight". */
  label: string;
  /** Pre-formatted slug for the deep-link query string. */
  slug: string;
}

export interface VariantPriceStatsTableProps {
  /** Per-variant stats, already shaped with `label` + `slug`. */
  rows: VariantPriceStatsRow[];
  /**
   * Slug of the currently selected variant. When set, that row gets a
   * "Dipilih" badge so the user can see the active filter at a glance.
   */
  selectedSlug?: string | null;
  /** Parent product slug — used to build the `?v=` deep link. */
  productSlug: string;
  /**
   * Compact mode trims padding/icon sizes for use inside tight cards
   * (e.g. the search results card). Default: full layout.
   */
  compact?: boolean;
  className?: string;
}

export function VariantPriceStatsTable({
  rows,
  selectedSlug,
  productSlug,
  compact = false,
  className = "",
}: VariantPriceStatsTableProps) {
  if (rows.length === 0) return null;

  // Sort: cheapest-min first, then "no data" variants at the bottom so
  // the visual order matches the question "which should I buy?".
  const sorted = [...rows].sort((a, b) => {
    const aHas = a.minPrice != null;
    const bHas = b.minPrice != null;
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    if (!aHas && !bHas) return 0;
    return (a.minPrice as number) - (b.minPrice as number);
  });

  // Winner = first row in sorted list with a non-null minPrice. The
  // "Termurah" badge is only meaningful when there's a real comparison
  // (≥ 2 variants with data). A single variant with data shows its
  // price plainly — "cheapest" is misleading when there is no second
  // option to be cheaper than.
  const variantsWithData = sorted.filter((r) => r.minPrice != null);
  const winnerId =
    variantsWithData.length >= 2 ? variantsWithData[0].variantId : null;

  return (
    <Card className={className} data-testid="variant-price-stats">
      <CardHeader className={compact ? "pb-3" : ""}>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Package className="h-4 w-4" />
          Harga per Varian
        </CardTitle>
        {!compact && (
          <p className="text-sm text-muted-foreground">
            Rentang harga dari semua marketplace, dikelompokkan per varian.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {sorted.map((row) => {
          const isSelected = selectedSlug != null && row.slug === selectedSlug;
          const isWinner = row.variantId === winnerId;
          const hasData = row.minPrice != null;
          return (
            <Link
              key={row.variantId}
              href={`/product/${productSlug}?v=${encodeURIComponent(row.slug)}`}
              scroll={false}
              className={[
                "flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors",
                isSelected
                  ? "border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-200"
                  : "border-border hover:border-emerald-300 hover:bg-muted/40",
                compact ? "py-2" : "py-3",
              ]
                .filter(Boolean)
                .join(" ")}
              data-testid="variant-stats-row"
              data-variant-slug={row.slug}
              data-is-selected={isSelected ? "true" : "false"}
              data-is-winner={isWinner ? "true" : "false"}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={[
                      "truncate text-sm font-semibold",
                      isSelected ? "text-emerald-900" : "text-foreground",
                    ].join(" ")}
                  >
                    {row.label}
                  </span>
                  {isSelected && (
                    <Badge
                      variant="secondary"
                      className="bg-emerald-100 px-1.5 py-0 text-[10px] text-emerald-700"
                    >
                      Dipilih
                    </Badge>
                  )}
                  {isWinner && hasData && !isSelected && (
                    <Badge
                      variant="secondary"
                      className="bg-amber-100 px-1.5 py-0 text-[10px] text-amber-700"
                    >
                      <Sparkles className="mr-0.5 h-2.5 w-2.5" />
                      Termurah
                    </Badge>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  {hasData ? (
                    <>
                      <span>
                        {row.inStockCount}/{row.offerCount} tersedia
                      </span>
                      {row.lastUpdated && (
                        <span className="hidden sm:inline">
                          · update {formatRelativeDate(row.lastUpdated)}
                        </span>
                      )}
                    </>
                  ) : (
                    <span>Belum ada penawaran</span>
                  )}
                </div>
              </div>
              {hasData && (
                <div className="shrink-0 text-right">
                  <div className="flex items-baseline justify-end gap-1.5 text-sm font-bold text-emerald-700">
                    <TrendingDown className="h-3.5 w-3.5" />
                    {formatRupiah(row.minPrice as number)}
                  </div>
                  {row.maxPrice != null && row.maxPrice !== row.minPrice && (
                    <div className="mt-0.5 flex items-baseline justify-end gap-1 text-[11px] text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      s/d {formatRupiah(row.maxPrice)}
                    </div>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}

/**
 * Lightweight relative date ("2 jam lalu", "kemarin") without pulling in
 * date-fns to keep this server component dependency-free. The output is
 * intentionally approximate — the chart and stats table are about
 * directional signal, not exact timestamps.
 */
function formatRelativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const now = Date.now();
  const diffMs = now - then;
  if (diffMs < 0) return "";
  const minutes = Math.floor(diffMs / 60_000);
  // Less than a minute → "baru saja" (avoids "0 mnt lalu" which feels broken).
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} mnt lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "kemarin";
  if (days < 7) return `${days} hari lalu`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} mgu lalu`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} bln lalu`;
  return `${Math.floor(days / 365)} thn lalu`;
}
