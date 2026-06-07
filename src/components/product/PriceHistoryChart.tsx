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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getMarketplaceName,
  getMarketplaceColor,
  formatRupiah,
} from "@/lib/utils";
import type { PriceHistoryPoint, Marketplace } from "@/lib/types";

interface PriceHistoryChartProps {
  data: PriceHistoryPoint[];
}

const marketplaces: Marketplace[] = [
  "tokopedia",
  "shopee",
  "bukalapak",
  "lazada",
  "blibli",
  "tiktok",
];

function formatYAxis(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}jt`;
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
  if (!active || !payload) return null;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="mb-2 text-sm font-medium">{label}</p>
      {payload.map((entry) => (
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

export function PriceHistoryChart({ data }: PriceHistoryChartProps) {
  const chartData = useMemo(() => {
    return data.map((point) => {
      const formattedDate = new Date(point.date).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      });
      return {
        date: formattedDate,
        ...point.prices,
      };
    });
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Riwayat Harga (30 Hari)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={formatYAxis}
                tick={{ fontSize: 11 }}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "12px" }}
                formatter={(value: string) =>
                  getMarketplaceName(value as Marketplace)
                }
              />
              {marketplaces.map((mp) => (
                <Line
                  key={mp}
                  type="monotone"
                  dataKey={mp}
                  name={mp}
                  stroke={getMarketplaceColor(mp)}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
