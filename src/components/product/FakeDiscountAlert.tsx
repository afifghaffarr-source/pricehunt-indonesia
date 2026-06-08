"use client";

import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FakeDiscountOutput } from "@/lib/fake-discount";

interface FakeDiscountAlertProps {
  currentPrice: number;
  originalPrice: number;
  lowestHistoricalPrice?: number;
  median30Day?: number;
  median90Day?: number;
  discountPercent?: number;
  className?: string;
}

export function FakeDiscountAlert({
  currentPrice,
  originalPrice,
  lowestHistoricalPrice,
  median30Day,
  median90Day,
  discountPercent,
  className,
}: FakeDiscountAlertProps) {
  const [analysis, setAnalysis] = useState<FakeDiscountOutput | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalysis() {
      try {
        const response = await fetch("/api/recommendation/fake-discount", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentPrice,
            originalPrice,
            lowestHistoricalPrice,
            median30Day,
            median90Day,
            discountPercent,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setAnalysis(data);
        }
      } catch (error) {
        console.error("Failed to fetch fake discount analysis:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAnalysis();
  }, [currentPrice, originalPrice, lowestHistoricalPrice, median30Day, median90Day, discountPercent]);

  if (isLoading || !analysis) {
    return null;
  }

  // Only show alert for suspicious, likely_fake, or insufficient_data
  // Don't show for legitimate or normal discounts
  if (analysis.status === 'legitimate' || analysis.status === 'normal') {
    return null;
  }

  const config = {
    suspicious: {
      icon: AlertTriangle,
      variant: "default" as const,
      bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
      borderColor: "border-yellow-300 dark:border-yellow-800",
      textColor: "text-yellow-900 dark:text-yellow-100",
      iconColor: "text-yellow-600 dark:text-yellow-400",
      title: "⚠️ Diskon Mencurigakan",
    },
    likely_fake: {
      icon: AlertTriangle,
      variant: "destructive" as const,
      bgColor: "bg-red-50 dark:bg-red-950/20",
      borderColor: "border-red-300 dark:border-red-800",
      textColor: "text-red-900 dark:text-red-100",
      iconColor: "text-red-600 dark:text-red-400",
      title: "🚨 Diskon Kemungkinan Palsu",
    },
    insufficient_data: {
      icon: Info,
      variant: "default" as const,
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      borderColor: "border-blue-300 dark:border-blue-800",
      textColor: "text-blue-900 dark:text-blue-100",
      iconColor: "text-blue-600 dark:text-blue-400",
      title: "ℹ️ Data Belum Cukup",
    },
  };

  const alertConfig = config[analysis.status];
  const Icon = alertConfig.icon;

  // Convert confidence number (0-100) to Indonesian text
  const getConfidenceText = (confidence: number): string => {
    if (confidence >= 70) return 'Tinggi';
    if (confidence >= 40) return 'Sedang';
    return 'Rendah';
  };

  const confidenceText = getConfidenceText(analysis.confidence);

  // Map flag types to Indonesian descriptions
  const flagDescriptions: Record<string, string> = {
    original_price_inflated: 'Harga normal dinaikkan sebelum diskon',
    discount_too_high: 'Persentase diskon tidak wajar',
    price_above_historical_max: 'Harga di atas maksimum historis',
    recent_price_spike: 'Lonjakan harga mendadak',
    current_price_normal: 'Harga setelah diskon masih normal',
    insufficient_history: 'Data riwayat harga terbatas',
  };

  return (
    <Alert 
      variant={alertConfig.variant}
      className={cn(
        "border-2",
        alertConfig.bgColor,
        alertConfig.borderColor,
        className
      )}
    >
      <Icon className={cn("h-5 w-5", alertConfig.iconColor)} />
      <AlertTitle className={cn("text-lg font-semibold", alertConfig.textColor)}>
        {alertConfig.title}
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <div>
          <p className={cn("font-medium leading-relaxed", alertConfig.textColor)}>
            {analysis.explanation}
          </p>
        </div>

        {/* Confidence Level */}
        <div className="flex items-center justify-between">
          <span className="text-sm">Tingkat Keyakinan</span>
          <Badge variant="outline" className={alertConfig.textColor}>
            {confidenceText} ({analysis.confidence}%)
          </Badge>
        </div>

        {/* Analysis Details */}
        {isExpanded && analysis.analysis && (
          <div className={cn(
            "rounded-lg p-3 text-sm space-y-2",
            "bg-background/50 border",
            alertConfig.borderColor
          )}>
            <p className="font-medium">Detail Analisis:</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Persentase Diskon:</span>
                <span className="font-medium">{analysis.analysis.discountPercent.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Inflasi Harga Normal:</span>
                <span className="font-medium">{analysis.analysis.originalPriceInflation.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Harga vs Median:</span>
                <span className="font-medium">{analysis.analysis.currentPriceVsMedian.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Stabilitas Harga:</span>
                <span className="font-medium capitalize">{analysis.analysis.priceStability}</span>
              </div>
            </div>
          </div>
        )}

        {/* Flags */}
        {analysis.flags && analysis.flags.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Indikator yang Terdeteksi:</p>
            <div className="space-y-1">
              {analysis.flags.map((flag: string, index: number) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <div className={cn("mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0", alertConfig.iconColor.replace("text-", "bg-"))} />
                  <p className="leading-relaxed">{flagDescriptions[flag] || flag}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expand/Collapse Button */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="mr-1 h-3 w-3" />
              Sembunyikan Detail
            </>
          ) : (
            <>
              <ChevronDown className="mr-1 h-3 w-3" />
              Lihat Detail Analisis
            </>
          )}
        </Button>

        {/* Disclaimer for insufficient data */}
        {analysis.status === 'insufficient_data' && (
          <p className="text-xs opacity-75">
            * Kami belum punya cukup data historis untuk memverifikasi diskon ini secara akurat.
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}
