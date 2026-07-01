'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatRupiah } from '@/lib/utils';

interface PriceDataPoint {
  date: string;
  price: number;
}

interface InteractivePriceChartProps {
  data: PriceDataPoint[];
}

export function InteractivePriceChart({ data }: InteractivePriceChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <defs>
          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" stroke="rgb(148 163 184)" fontSize={12} />
        <YAxis
          tickFormatter={(value) => formatRupiah(value)}
          stroke="rgb(148 163 184)"
          fontSize={12}
        />
        <Tooltip
          formatter={(value) => 
            typeof value === 'number' ? formatRupiah(value) : '-'
          }
          contentStyle={{
            backgroundColor: 'rgb(15 23 42)',
            border: '1px solid rgb(148 163 184 / 0.2)',
            borderRadius: '8px',
          }}
        />
        <Line
          type="monotone"
          dataKey="price"
          stroke="rgb(16 185 129)"
          strokeWidth={2}
          dot={false}
          fill="url(#priceGradient)"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
