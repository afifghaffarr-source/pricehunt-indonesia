"use client";

import { useState, useEffect } from "react";
import { PricePredictionCard } from "@/components/ai/PricePredictionCard";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface PredictionSectionProps {
  productId: string;
}

interface PredictionData {
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
}

export function PredictionSection({ productId }: PredictionSectionProps) {
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    fetch("/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.prediction) {
          setPrediction(data.prediction);
        } else {
          setError(true);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.warn("Prediction fetch failed:", err);
        }
        setError(true);
      })
      .finally(() => {
        clearTimeout(timeout);
        setLoading(false);
      });

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [productId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 p-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Menganalisis tren harga...</span>
        </CardContent>
      </Card>
    );
  }

  if (error || !prediction) {
    return null;
  }

  return <PricePredictionCard prediction={prediction} />;
}
