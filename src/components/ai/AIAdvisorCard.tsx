import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIAdvisorCardProps {
  verdict: string;
  className?: string;
}

export function AIAdvisorCard({ verdict, className }: AIAdvisorCardProps) {
  const isPositive =
    verdict.toLowerCase().includes("terbaik") ||
    verdict.toLowerCase().includes("bagus") ||
    verdict.toLowerCase().includes("sekarang");
  const isNegative =
    verdict.toLowerCase().includes("tunggu") ||
    verdict.toLowerCase().includes("turun");

  return (
    <Card className={cn("border-primary/20 bg-primary/5", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Brain className="h-4 w-4 text-primary" />
          </div>
          AI Price Advisor
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
                : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
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
          <p className="text-sm leading-relaxed text-foreground">{verdict}</p>
        </div>
      </CardContent>
    </Card>
  );
}
