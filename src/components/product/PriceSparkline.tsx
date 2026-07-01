'use client';

import { Sparklines, SparklinesLine } from 'react-sparklines';

interface PriceSparklineProps {
  data: number[];
  color?: string;
}

export function PriceSparkline({
  data,
  color = 'rgb(16 185 129)',
}: PriceSparklineProps) {
  if (data.length === 0) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/80 to-transparent">
      <Sparklines data={data} height={40}>
        <SparklinesLine
          color={color}
          style={{ strokeWidth: 2, fill: 'none' }}
        />
      </Sparklines>
    </div>
  );
}
