"use client";

import { formatDistanceToNow } from "date-fns";
import { id as indonesianLocale } from "date-fns/locale";
import { Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface LastCheckedTimestampProps {
  lastSeenAt: string; // ISO timestamp
  className?: string;
  showStaleWarning?: boolean;
}

export function LastCheckedTimestamp({
  lastSeenAt,
  className,
  showStaleWarning = true,
}: LastCheckedTimestampProps) {
  const lastSeen = new Date(lastSeenAt);
  const now = new Date();
  const hoursSinceLastCheck = (now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60);
  
  // Consider data stale if > 24 hours old
  const isStale = hoursSinceLastCheck > 24;
  
  const timeAgo = formatDistanceToNow(lastSeen, {
    addSuffix: true,
    locale: indonesianLocale,
  });

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs",
        isStale && showStaleWarning ? "text-amber-600" : "text-muted-foreground",
        className
      )}
    >
      {isStale && showStaleWarning ? (
        <AlertTriangle className="h-3.5 w-3.5" />
      ) : (
        <Clock className="h-3.5 w-3.5" />
      )}
      <span>
        Dicek {timeAgo}
        {isStale && showStaleWarning && " • Data mungkin tidak akurat"}
      </span>
    </div>
  );
}
