"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  Clock, 
  Eye, 
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BuyOrWaitOutput } from "@/lib/buy-or-wait";

interface BuyOrWaitDecisionProps {
  currentPrice: number;
  originalPrice?: number;
  lowestHistoricalPrice?: number;
  median30Day?: number;
  median90Day?: number;
  sellerRating?: number;
  sellerReviewCount?: number;
  isOfficialStore?: boolean;
  stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'unknown';
  hasVoucher?: boolean;
  hasFreeShipping?: boolean;
  daysUntilNextCampaign?: number;
  campaignName?: string;
  priceVolatility?: 'stable' | 'volatile';
  className?: string;
}

export function BuyOrWaitDecision({
  currentPrice,
  originalPrice,
  lowestHistoricalPrice,
  median30Day,
  median90Day,
  sellerRating,
  sellerReviewCount,
  isOfficialStore,
  stockStatus,
  hasVoucher,
  hasFreeShipping,
  daysUntilNextCampaign,
  campaignName,
  priceVolatility,
  className,
}: BuyOrWaitDecisionProps) {
  const [recommendation, setRecommendation] = useState<BuyOrWaitOutput | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRecommendation() {
      try {
        const response = await fetch("/api/recommendation/buy-or-wait", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentPrice,
            originalPrice,
            lowestHistoricalPrice,
            median30Day,
            median90Day,
            sellerRating,
            sellerReviewCount,
            isOfficialStore,
            stockStatus,
            hasVoucher,
            hasFreeShipping,
            daysUntilNextCampaign,
            campaignName,
            priceVolatility,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setRecommendation(data);
        }
      } catch (error) {
        console.error("Failed to fetch recommendation:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRecommendation();
  }, [
    currentPrice,
    originalPrice,
    lowestHistoricalPrice,
    median30Day,
    median90Day,
    sellerRating,
    sellerReviewCount,
    isOfficialStore,
    stockStatus,
    hasVoucher,
    hasFreeShipping,
    daysUntilNextCampaign,
    campaignName,
    priceVolatility,
  ]);

  if (isLoading) {
    return (
      <Card className={cn("border-2", className)}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Sparkles className="h-5 w-5 animate-pulse" />
            <p>Menganalisis harga...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!recommendation) {
    return null;
  }

  const config = {
    buy_now: {
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/30",
      borderColor: "border-green-200 dark:border-green-800",
      title: "Beli Sekarang",
      emoji: "✅",
    },
    wait: {
      icon: Clock,
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
      borderColor: "border-yellow-200 dark:border-yellow-800",
      title: "Tunggu Dulu",
      emoji: "⏳",
    },
    watch: {
      icon: Eye,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      borderColor: "border-blue-200 dark:border-blue-800",
      title: "Pantau Harga",
      emoji: "👀",
    },
    avoid: {
      icon: AlertTriangle,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-950/30",
      borderColor: "border-red-200 dark:border-red-800",
      title: "Hindari",
      emoji: "⚠️",
    },
  };

  const rec = config[recommendation.recommendation];
  const Icon = rec.icon;

  // Map confidence level to display text
  const confidenceText = {
    high: 'Tinggi',
    medium: 'Sedang',
    low: 'Rendah',
  }[recommendation.confidence];

  return (
    <Card className={cn("border-2", rec.borderColor, rec.bgColor, className)}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={cn("rounded-full p-2", rec.bgColor)}>
              <Icon className={cn("h-6 w-6", rec.color)} />
            </div>
            <div>
              <CardTitle className="text-xl">
                <span className="mr-2">{rec.emoji}</span>
                Rekomendasi PriceHunt
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Berdasarkan analisis data harga yang tersedia
              </p>
            </div>
          </div>
          <Badge
            variant="secondary"
            className={cn("text-xs font-semibold", rec.color)}
          >
            {rec.title}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Decision Message */}
        <div className={cn("rounded-lg p-4", rec.bgColor, "border", rec.borderColor)}>
          <p className="font-medium leading-relaxed">
            {recommendation.recommendation === "buy_now" && (
              <>
                Harga saat ini <span className="font-bold">bagus untuk dibeli</span>. 
                Berdasarkan riwayat harga, ini adalah waktu yang tepat untuk checkout.
              </>
            )}
            {recommendation.recommendation === "wait" && (
              <>
                Sebaiknya <span className="font-bold">tunggu beberapa waktu</span>. 
                Ada kemungkinan harga bisa turun lebih rendah.
              </>
            )}
            {recommendation.recommendation === "watch" && (
              <>
                <span className="font-bold">Pantau terus harga ini</span>. 
                Aktifkan alert agar tidak ketinggalan saat harga turun.
              </>
            )}
            {recommendation.recommendation === "avoid" && (
              <>
                <span className="font-bold">Hati-hati dengan produk ini</span>. 
                Ada indikasi yang perlu diperhatikan sebelum membeli.
              </>
            )}
          </p>
        </div>

        {/* Confidence Level */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Tingkat Keyakinan</span>
          <Badge variant="outline">{confidenceText}</Badge>
        </div>

        {/* Reasons */}
        <div className="space-y-2">
          {recommendation.reasons.slice(0, isExpanded ? undefined : 3).map((reason: string, index: number) => (
            <div key={index} className="flex items-start gap-2 text-sm">
              <div className={cn("mt-0.5 h-1.5 w-1.5 rounded-full flex-shrink-0", rec.color.replace("text-", "bg-"))} />
              <p className="leading-relaxed">{reason}</p>
            </div>
          ))}
        </div>

        {/* Expand/Collapse */}
        {recommendation.reasons.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="mr-2 h-4 w-4" />
                Tampilkan Lebih Sedikit
              </>
            ) : (
              <>
                <ChevronDown className="mr-2 h-4 w-4" />
                Lihat Semua Alasan ({recommendation.reasons.length})
              </>
            )}
          </Button>
        )}

        {/* Target Price (if applicable) */}
        {recommendation.targetPrice && (
          <div className={cn("rounded-lg border p-3", rec.borderColor)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className={cn("h-4 w-4", rec.color)} />
                <span className="text-sm font-medium">Target Harga Ideal</span>
              </div>
              <span className="text-lg font-bold">
                Rp {recommendation.targetPrice.amount.toLocaleString("id-ID")}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {recommendation.targetPrice.reasoning}
            </p>
          </div>
        )}

        {/* Next Campaign Info */}
        {daysUntilNextCampaign && daysUntilNextCampaign > 0 && (
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
            <TrendingUp className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <p className="font-medium">Campaign Mendatang</p>
              <p className="text-muted-foreground">
                Sekitar {daysUntilNextCampaign} hari lagi {campaignName ? `ada ${campaignName}` : 'ada kampanye belanja'}.
                Harga biasanya turun saat event besar.
              </p>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground">
          * Rekomendasi berdasarkan analisis data historis yang tersedia. 
          Harga dapat berubah sewaktu-waktu. Keputusan akhir tetap di tangan Anda.
        </p>
      </CardContent>
    </Card>
  );
}
