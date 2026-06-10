"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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

function CustomTooltip({
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

export function PriceHistoryChart({
  data,
  title = "Riwayat Harga (30 Hari)",
  className = "",
  showLegend = true,
}: PriceHistoryChartProps) {
  // Process and optimize chart data
  const { chartData, stats } = useMemo(() => {
    // Sort by date and validate
    const sorted = [...data]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .filter((point) => {
        // Keep points that have at least one valid price
        return marketplaces.some(
          (mp) => point.prices[mp] != null && point.prices[mp] > 0
        );
      });

    // Limit to 50 points for performance
    let processedData = sorted;
    if (sorted.length > 50) {
      const step = Math.ceil(sorted.length / 50);
      processedData = sorted.filter((_, index) => index % step === 0);
    }

    // Format dates with date-fns for better Indonesian locale support
    const formatted = processedData.map((point) => ({
      date: format(new Date(point.date), "dd MMM", { locale: id }),
      fullDate: format(new Date(point.date), "dd MMMM yyyy", { locale: id }),
      ...point.prices,
    }));

    // Calculate stats
    const allPrices = processedData.flatMap((point) =>
      marketplaces
        .map((mp) => point.prices[mp])
        .filter((price): price is number => price != null && price > 0)
    );

    const stats = {
      count: processedData.length,
      min: allPrices.length > 0 ? Math.min(...allPrices) : 0,
      max: allPrices.length > 0 ? Math.max(...allPrices) : 0,
    };

    return { chartData: formatted, stats };
  }, [data]);

  // Calculate Y-axis domain with padding
  const yAxisDomain = useMemo(() => {
    if (stats.min === 0 && stats.max === 0) return [0, 100000];

    const padding = (stats.max - stats.min) * 0.1; // 10% padding
    return [
      Math.floor((stats.min - padding) / 1000) * 1000,
      Math.ceil((stats.max + padding) / 1000) * 1000,
    ];
  }, [stats]);

  // Empty state
  if (chartData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
            Belum ada data riwayat harga
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-[300px] w-full md:h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
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
              <Tooltip content={<CustomTooltip />} />
              {showLegend && (
                <Legend
                  wrapperStyle={{ fontSize: "12px" }}
                  formatter={(value: string) =>
                    getMarketplaceName(value as Marketplace)
                  }
                />
              )}
              {marketplaces.map((mp) => (
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
          </ResponsiveContainer>
        </div>

        {/* Summary stats */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{stats.count} data point</span>
          <span>
            Range: {formatRupiah(stats.min)} - {formatRupiah(stats.max)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
