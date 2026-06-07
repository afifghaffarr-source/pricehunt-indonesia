import { Badge } from "@/components/ui/badge";
import { Globe, Search, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface VexoSearchBadgeProps {
  source: string;
  className?: string;
}

export function VexoSearchBadge({ source, className }: VexoSearchBadgeProps) {
  if (!source.startsWith("vexo")) return null;

  const labels: Record<string, { text: string; icon: typeof Globe }> = {
    "vexo-google": { text: "Google via Vexo", icon: Globe },
    "vexo-duckduckgo": { text: "DuckDuckGo via Vexo", icon: Search },
    "vexo-image": { text: "Image via Vexo", icon: Globe },
    "vexo-ai": { text: "AI via Vexo", icon: Zap },
    "vexo": { text: "VexoAPI", icon: Globe },
  };

  const info = labels[source] || labels["vexo"];
  const Icon = info.icon;

  return (
    <Badge
      variant="outline"
      className={cn("gap-1 text-xs border-violet-300 text-violet-600 dark:border-violet-700 dark:text-violet-400", className)}
    >
      <Icon className="h-3 w-3" />
      {info.text}
    </Badge>
  );
}
