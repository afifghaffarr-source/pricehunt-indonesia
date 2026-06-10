'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface PricePoint {
  date: string; // ISO date string
  price: number;
  marketplace?: string;
}

interface PriceHistoryChartProps {
  data: PricePoint[];
  title?: string;
  className?: string;
  showMarketplace?: boolean;
}

// Format currency untuk Rupiah
const formatRupiah = (value: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

// Format singkat untuk Y-axis (1.5jt instead of Rp 1.500.000)
const formatShortRupiah = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}jt`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}rb`;
  }
  return value.toString();
};

// Custom tooltip
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-3 shadow-lg">
        <p className="text-sm font-medium">
          {format(new Date(data.date), 'dd MMM yyyy', { locale: id })}
        </p>
        <p className="text-lg font-bold text-primary">
          {formatRupiah(data.price)}
        </p>
        {data.marketplace && (
          <p className="text-xs text-muted-foreground">{data.marketplace}</p>
        )}
      </div>
    );
  }
  return null;
};

export function PriceHistoryChart({
  data,
  title = 'Riwayat Harga',
  className = '',
  showMarketplace = false,
}: PriceHistoryChartProps) {
  // Sort data by date and limit to reasonable number of points
  const chartData = useMemo(() => {
    const sorted = [...data]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .filter((point) => point.price > 0); // Filter invalid prices

    // Limit to 50 points for performance
    if (sorted.length > 50) {
      const step = Math.ceil(sorted.length / 50);
      return sorted.filter((_, index) => index % step === 0);
    }

    return sorted;
  }, [data]);

  // Calculate min/max for Y-axis domain
  const priceRange = useMemo(() => {
    if (chartData.length === 0) return { min: 0, max: 100000 };
    
    const prices = chartData.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.1; // 10% padding

    return {
      min: Math.floor((min - padding) / 1000) * 1000,
      max: Math.ceil((max + padding) / 1000) * 1000,
    };
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <div className={`rounded-lg border bg-muted/50 p-8 text-center ${className}`}>
        <p className="text-muted-foreground">
          Belum ada data riwayat harga
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold">{title}</h3>
      )}
      
      <div className="h-[300px] w-full md:h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={(date) =>
                format(new Date(date), 'dd MMM', { locale: id })
              }
              className="text-xs"
              stroke="currentColor"
            />
            <YAxis
              tickFormatter={formatShortRupiah}
              domain={[priceRange.min, priceRange.max]}
              className="text-xs"
              stroke="currentColor"
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="price"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{chartData.length} data point</span>
        <span>
          Range: {formatRupiah(priceRange.min)} - {formatRupiah(priceRange.max)}
        </span>
      </div>
    </div>
  );
}
