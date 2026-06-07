"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";

interface VexoProductSummaryProps {
  productName: string;
  category: string;
  specs: Record<string, string>;
}

export function VexoProductSummary({ productName, category, specs }: VexoProductSummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    let cancelled = false;

    async function fetchSummary() {
      const specsText = Object.entries(specs)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");

      try {
        const res = await fetch("/api/vexo/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intent: "product-summary",
            context: `${productName} (${category}). Spesifikasi: ${specsText}`,
          }),
        });
        const data = await res.json();

        if (!cancelled && data.result) {
          setSummary(data.result);
        }
      } catch {
        // ignore
      }
      if (!cancelled) setLoading(false);
    }

    fetchSummary();
    return () => { cancelled = true; };
  }, [productName, category, specs]);

  if (loading) {
    return (
      <Card className="border-violet-200 dark:border-violet-800">
        <CardContent className="flex items-center gap-2 p-4">
          <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
          <span className="text-sm text-muted-foreground">AI meringkas produk...</span>
        </CardContent>
      </Card>
    );
  }

  if (!summary) return null;

  return (
    <Card className="border-violet-200 dark:border-violet-800">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-violet-500" />
          AI Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed">{summary}</p>
      </CardContent>
    </Card>
  );
}
