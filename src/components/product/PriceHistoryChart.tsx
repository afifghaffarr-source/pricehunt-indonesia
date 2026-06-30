"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getMarketplaceName,
  getMarketplaceColor,
  formatRupiah,
} from "@/lib/utils";
import type { PriceHistoryPoint, Marketplace } from "@/lib/types";

interface PriceHistoryChartProps {
  data: PriceHistoryPoint[];
  title?: string;
  className?: string;
  showLegend?: boolean;
  /**
   * Phase 7 — Variant-aware series. When provided (non-empty), the chart
   * renders one line per variant instead of one per marketplace. The
   * `data` prop is ignored in variant mode.
   *
   * Each series's `data` is sorted oldest → newest. Colors come from the
   * caller (typically matched to the variant picker chips so the user can
   * correlate the line to the chip group at a glance).
   */
  series?: VariantChartSeries[];
  /** Override title when in variant mode. */
  variantModeTitle?: string;
}

export interface VariantChartSeries {
  id: string;
  label: string;
  color: string;
  data: { date: string; price: number }[];
}

const marketplaces: Marketplace[] = [
  "tokopedia",
  "shopee",
  "bukalapak",
  "lazada",
  "blibli",
  "tiktok",
];

// Format singkat untuk Y-axis (1.5jt instead of Rp 1.500.000)
function formatYAxis(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}rb`;
  return value.toString();
}

function MarketplaceTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  // Filter out null/undefined values
  const validPayload = payload.filter((entry) => entry.value != null);
  if (validPayload.length === 0) return null;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-lg">
      <p className="mb-2 text-sm font-medium">{label}</p>
      {validPayload.map((entry) => (
        <div
          key={entry.name}
          className="flex items-center justify-between gap-4 text-sm"
        >
          <div className="flex items-center gap-2">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span>{getMarketplaceName(entry.name as Marketplace)}</span>
          </div>
          <span className="font-semibold">{formatRupiah(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

function VariantTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey?: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const validPayload = payload.filter((entry) => entry.value != null);
  if (validPayload.length === 0) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-lg">
      <p className="mb-2 text-sm font-medium">{label}</p>
      {validPayload.map((entry) => (
        <div
          key={entry.dataKey ?? entry.name}
          className="flex items-center justify-between gap-4 text-sm"
        >
          <div className="flex items-center gap-2">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span>{entry.name}</span>
          </div>
          <span className="font-semibold">{formatRupiah(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function PriceHistoryChart({
  data,
  title = "Riwayat Harga (30 Hari)",
  className = "",
  showLegend = true,
  series,
  variantModeTitle,
}: PriceHistoryChartProps) {
  // Phase 7 — mode is determined by the prop, not a toggle. The parent
  // decides which view to show (page currently shows marketplace mode by
  // default; variant mode is opt-in via `series`).
  const variantMode = !!series && series.length > 0;

  // Process and optimize chart data
  const { chartData, stats, emptyMessage } = useMemo(() => {
    if (variantMode) {
      // Variant mode: union all dates across series, then for each
      // date look up the price in each series (null if missing).
      const allDates = new Set<string>();
      for (const s of series!) {
        for (const p of s.data) allDates.add(p.date);
      }
      const sortedDates = Array.from(allDates).sort();

      const formatted = sortedDates.map((date) => {
        const row: Record<string, number | string | null> = {
          date: format(new Date(date), "dd MMM", { locale: id }),
          fullDate: format(new Date(date), "dd MMMM yyyy", { locale: id }),
        };
        for (const s of series!) {
          const hit = s.data.find((p) => p.date === date);
          row[s.id] = hit ? hit.price : null;
        }
        return row;
      });

      // Limit to 50 points for performance (sample evenly).
      let processedData = formatted;
      if (formatted.length > 50) {
        const step = Math.ceil(formatted.length / 50);
        processedData = formatted.filter((_, index) => index % step === 0);
      }

      // Compute global min/max across all series for the Y-axis.
      const allPrices: number[] = [];
      for (const s of series!) {
        for (const p of s.data) {
          if (Number.isFinite(p.price) && p.price > 0) allPrices.push(p.price);
        }
      }
      const stats = {
        count: processedData.length,
        min: allPrices.length > 0 ? Math.min(...allPrices) : 0,
        max: allPrices.length > 0 ? Math.max(...allPrices) : 0,
        seriesCount: series!.length,
      };
      return {
        chartData: processedData,
        stats,
        emptyMessage: "Belum ada data riwayat harga per varian",
      };
    }

    // Marketplace mode (original behavior).
    const sorted = [...data]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .filter((point) => {
        return marketplaces.some(
          (mp) => point.prices[mp] != null && point.prices[mp] > 0,
        );
      });

    let processedData = sorted;
    if (sorted.length > 50) {
      const step = Math.ceil(sorted.length / 50);
      processedData = sorted.filter((_, index) => index % step === 0);
    }

    const formatted = processedData.map((point) => ({
      date: format(new Date(point.date), "dd MMM", { locale: id }),
      fullDate: format(new Date(point.date), "dd MMMM yyyy", { locale: id }),
      ...point.prices,
    }));

    const allPrices = processedData.flatMap((point) =>
      marketplaces
        .map((mp) => point.prices[mp])
        .filter((price): price is number => price != null && price > 0),
    );

    const stats = {
      count: processedData.length,
      min: allPrices.length > 0 ? Math.min(...allPrices) : 0,
      max: allPrices.length > 0 ? Math.max(...allPrices) : 0,
      seriesCount: 0,
    };

    return { chartData: formatted, stats, emptyMessage: "Belum ada data riwayat harga" };
  }, [data, series, variantMode]);

  // Calculate Y-axis domain with padding
  const yAxisDomain = useMemo(() => {
    if (stats.min === 0 && stats.max === 0) return [0, 100000];

    const padding = (stats.max - stats.min) * 0.1; // 10% padding
    return [
      Math.floor((stats.min - padding) / 1000) * 1000,
      Math.ceil((stats.max + padding) / 1000) * 1000,
    ];
  }, [stats]);

  const displayTitle = variantMode
    ? (variantModeTitle ?? "Riwayat Harga per Varian (30 Hari)")
    : title;

  // Empty state
  if (chartData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">{displayTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
            {emptyMessage}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">{displayTitle}</CardTitle>
        {variantMode && (
          <p className="text-sm text-muted-foreground">
            Garis per varian · harga terendah harian antar-marketplace
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <PriceHistoryChartInner
          chartData={chartData as Array<{ date: string; fullDate: string; [key: string]: number | string | null }>}
          showLegend={showLegend}
          yAxisDomain={yAxisDomain}
          variantMode={variantMode}
          series={series}
        />
        {/* Summary stats */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {stats.count} data point
            {variantMode && stats.seriesCount > 0
              ? ` · ${stats.seriesCount} varian`
              : ""}
          </span>
          <span>
            Range: {formatRupiah(stats.min)} - {formatRupiah(stats.max)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Resize-observer wrapper around Recharts.
 *
 * Recharts' built-in `ResponsiveContainer` returns `width(-1) / height(-1)`
 * when the parent hasn't computed its layout yet (e.g. when the chart is
 * mounted inside a hidden tab, or during SSR/hydration). That triggers a
 * noisy `console.error` and renders nothing. Measuring the parent
 * ourselves with `ResizeObserver` and passing explicit `width`/`height`
 * to `LineChart` sidesteps the race entirely.
 */
function PriceHistoryChartInner({
  chartData,
  showLegend,
  yAxisDomain,
  variantMode,
  series,
}: {
  chartData: Array<{ date: string; fullDate: string; [key: string]: number | string | null }>;
  showLegend: boolean;
  yAxisDomain: [number | "auto" | "dataMin" | "dataMax", number | "auto" | "dataMin" | "dataMax"] | number[];
  variantMode: boolean;
  series?: VariantChartSeries[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Seed with the current size so the first paint isn't empty.
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setSize({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
    }
    const observer = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r && r.width > 0 && r.height > 0) {
        setSize({ w: Math.floor(r.width), h: Math.floor(r.height) });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Always render the wrapper so ResizeObserver can attach. The chart
  // itself only renders once we have real dimensions, which avoids the
  // "width(-1) and height(-1)" warning from Recharts.
  return (
    <div
      ref={containerRef}
      className="h-[300px] w-full min-w-0 md:h-[400px]"
      data-testid="price-history-chart"
      data-mode={variantMode ? "variant" : "marketplace"}
    >
      {size.w > 0 && size.h > 0 ? (
        <LineChart
          width={size.w}
          height={size.h}
          data={chartData}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
            stroke="currentColor"
          />
          <YAxis
            tickFormatter={formatYAxis}
            tick={{ fontSize: 11 }}
            width={60}
            domain={yAxisDomain}
            stroke="currentColor"
          />
          <Tooltip content={variantMode ? <VariantTooltip /> : <MarketplaceTooltip />} />
          {showLegend && (
            <Legend
              wrapperStyle={{ fontSize: "12px" }}
              formatter={(value: string) => {
                if (variantMode && series) {
                  const s = series.find((x) => x.id === value);
                  return s ? s.label : value;
                }
                return getMarketplaceName(value as Marketplace);
              }}
            />
          )}
          {variantMode && series
            ? series.map((s) => (
                <Line
                  key={s.id}
                  type="monotone"
                  dataKey={s.id}
                  name={s.id}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              ))
            : marketplaces.map((mp) => (
                <Line
                  key={mp}
                  type="monotone"
                  dataKey={mp}
                  name={mp}
                  stroke={getMarketplaceColor(mp)}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              ))}
        </LineChart>
      ) : null}
    </div>
  );
}
