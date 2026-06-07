"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Target, BarChart3 } from "lucide-react";
import { formatRupiah, cn } from "@/lib/utils";

interface PricePredictionProps {
  prediction: {
    trend: string;
    trendPercent: number;
    confidence: number;
    volatility: number;
    currentPrice: number;
    averagePrice: number;
    minPrice: number;
    maxPrice: number;
    predictions: { date: string; predictedPrice: number; days: number }[];
    analysis: string;
    dataPoints: number;
  };
}

export function PricePredictionCard({ prediction }: PricePredictionProps) {
  const trendIcon =
    prediction.trend === "falling" ? TrendingDown :
    prediction.trend === "rising" ? TrendingUp : Minus;

  const TrendIcon = trendIcon;

  const trendColor =
    prediction.trend === "falling" ? "text-green-600" :
    prediction.trend === "rising" ? "text-red-600" : "text-amber-600";

  const trendBg =
    prediction.trend === "falling" ? "bg-green-100 dark:bg-green-900/30" :
    prediction.trend === "rising" ? "bg-red-100 dark:bg-red-900/30" : "bg-amber-100 dark:bg-amber-900/30";

  const trendLabel =
    prediction.trend === "falling" ? "Harga Turun" :
    prediction.trend === "rising" ? "Harga Naik" : "Harga Stabil";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4" />
          Prediksi Harga AI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", trendBg)}>
            <TrendIcon className={cn("h-5 w-5", trendColor)} />
          </div>
          <div>
            <p className={cn("font-semibold", trendColor)}>{trendLabel}</p>
            <p className="text-sm text-muted-foreground">
              {prediction.trendPercent > 0 ? "+" : ""}{prediction.trendPercent}% dalam 30 hari
            </p>
          </div>
          <Badge variant="outline" className="ml-auto">
            {prediction.confidence}% yakin
          </Badge>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="rounded-md bg-muted/50 p-2">
            <p className="text-xs text-muted-foreground">Terendah</p>
            <p className="text-sm font-semibold">{formatRupiah(prediction.minPrice)}</p>
          </div>
          <div className="rounded-md bg-muted/50 p-2">
            <p className="text-xs text-muted-foreground">Rata-rata</p>
            <p className="text-sm font-semibold">{formatRupiah(prediction.averagePrice)}</p>
          </div>
          <div className="rounded-md bg-muted/50 p-2">
            <p className="text-xs text-muted-foreground">Tertinggi</p>
            <p className="text-sm font-semibold">{formatRupiah(prediction.maxPrice)}</p>
          </div>
          <div className="rounded-md bg-muted/50 p-2">
            <p className="text-xs text-muted-foreground">Volatilitas</p>
            <p className="text-sm font-semibold">{prediction.volatility}%</p>
          </div>
        </div>

        {prediction.predictions.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium">Prediksi Harga:</p>
            <div className="space-y-1">
              {prediction.predictions.map((p) => (
                <div key={p.days} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{p.days} hari lagi</span>
                  <span className="font-medium">{formatRupiah(p.predictedPrice)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {prediction.analysis && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="flex items-start gap-2">
              <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-sm">{prediction.analysis}</p>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Berdasarkan {prediction.dataPoints} data poin historis
        </p>
      </CardContent>
    </Card>
  );
}
