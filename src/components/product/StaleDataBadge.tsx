"use client";

import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StaleDataBadgeProps {
  lastSeenAt: string; // ISO timestamp
  className?: string;
  threshold?: number; // hours, default 24
}

export function StaleDataBadge({
  lastSeenAt,
  className,
  threshold = 24,
}: StaleDataBadgeProps) {
  const lastSeen = new Date(lastSeenAt);
  const now = new Date();
  const hoursSinceLastCheck =
    (now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60);

  const isStale = hoursSinceLastCheck > threshold;

  if (!isStale) return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        "flex items-center gap-1 border-amber-500 bg-amber-50 text-amber-700",
        className
      )}
    >
      <AlertTriangle className="h-3 w-3" />
      Data Lama
    </Badge>
  );
}
