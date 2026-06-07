import { Globe, Database, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchSourceInfoProps {
  sources: { name: string; count: number; status: "ok" | "error" | "unavailable" }[];
  className?: string;
}

export function SearchSourceInfo({ sources, className }: SearchSourceInfoProps) {
  if (sources.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-3 text-xs text-muted-foreground", className)}>
      <span>Sumber data:</span>
      {sources.map((s) => (
        <span
          key={s.name}
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2 py-0.5",
            s.status === "ok" && "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
            s.status === "error" && "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
            s.status === "unavailable" && "bg-muted text-muted-foreground"
          )}
        >
          {s.name === "database" ? (
            <Database className="h-3 w-3" />
          ) : s.status === "error" ? (
            <AlertTriangle className="h-3 w-3" />
          ) : (
            <Globe className="h-3 w-3" />
          )}
          {s.name} ({s.count})
        </span>
      ))}
    </div>
  );
}
