"use client";

import { cn, formatRupiah } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

interface PriceRangeFilterProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  className?: string;
}

export function PriceRangeFilter({
  min,
  max,
  value,
  onChange,
  className,
}: PriceRangeFilterProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Rentang Harga</span>
        <span className="font-medium">
          {formatRupiah(value[0])} — {formatRupiah(value[1])}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={Math.max(10000, Math.round((max - min) / 100))}
        value={value}
        onValueChange={(v) => onChange(v as [number, number])}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatRupiah(min)}</span>
        <span>{formatRupiah(max)}</span>
      </div>
    </div>
  );
}
