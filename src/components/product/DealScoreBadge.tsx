import { Badge } from "@/components/ui/badge";
import { getDealScoreInfo } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface DealScoreBadgeProps {
  score: number;
  className?: string;
  showLabel?: boolean;
}

export function DealScoreBadge({
  score,
  className,
  showLabel = true,
}: DealScoreBadgeProps) {
  const info = getDealScoreInfo(score);

  return (
    <Badge
      className={cn(
        info.bgColor,
        info.color,
        "font-semibold",
        className
      )}
    >
      {showLabel ? `${info.label} (${score})` : score}
    </Badge>
  );
}
