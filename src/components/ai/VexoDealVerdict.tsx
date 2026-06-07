"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface VexoDealVerdictProps {
  productName: string;
  lowestPrice: number;
  highestPrice: number;
  dealScore: number;
  marketplaceCount: number;
  aiVerdict?: string;
}

export function VexoDealVerdict({
  productName,
  lowestPrice,
  highestPrice,
  dealScore,
  marketplaceCount,
  aiVerdict,
}: VexoDealVerdictProps) {
  const [verdict, setVerdict] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"vexo" | "local">("local");

  useEffect(() => {
    let cancelled = false;

    async function fetchVerdict() {
      try {
        const context = [
          `Produk: ${productName}`,
          `Harga terendah: Rp${lowestPrice.toLocaleString("id-ID")}`,
          `Harga tertinggi: Rp${highestPrice.toLocaleString("id-ID")}`,
          `Deal score: ${dealScore}/100`,
          `Tersedia di ${marketplaceCount} marketplace`,
        ].join(". ");

        const res = await fetch("/api/vexo/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intent: "deal-verdict", context }),
        });
        const data = await res.json();

        if (!cancelled && data.result) {
          setVerdict(data.result);
          setSource("vexo");
        }
      } catch {
        // fallback to local
      }
      if (!cancelled) setLoading(false);
    }

    fetchVerdict();
    return () => { cancelled = true; };
  }, [productName, lowestPrice, highestPrice, dealScore, marketplaceCount]);

  const displayVerdict = verdict || aiVerdict || "";
  const isPositive =
    displayVerdict.toLowerCase().includes("beli") ||
    displayVerdict.toLowerCase().includes("bagus") ||
    displayVerdict.toLowerCase().includes("sekarang");
  const isNegative =
    displayVerdict.toLowerCase().includes("tunggu") ||
    displayVerdict.toLowerCase().includes("turun");

  if (loading && !aiVerdict) return null;

  return (
    <Card className="border-violet-200 bg-violet-50/50 dark:border-violet-800 dark:bg-violet-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
            {loading ? (
              <Sparkles className="h-4 w-4 animate-pulse text-violet-500" />
            ) : (
              <Brain className="h-4 w-4 text-violet-600" />
            )}
          </div>
          AI Deal Verdict
          {source === "vexo" && (
            <span className="ml-auto rounded-md bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
              VexoAPI
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
              isPositive
                ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                : isNegative
                ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                : "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
            )}
          >
            {isPositive ? (
              <TrendingDown className="h-3.5 w-3.5" />
            ) : isNegative ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <Minus className="h-3.5 w-3.5" />
            )}
          </div>
          <p className="text-sm leading-relaxed text-foreground">
            {loading ? "Menganalisis dengan AI..." : displayVerdict}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
