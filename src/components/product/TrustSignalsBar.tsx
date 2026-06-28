import { Clock, Database, Users, RefreshCw } from "lucide-react";

interface TrustSignalsBarProps {
  marketplaceCount: number;
  /**
   * Most recent update timestamp across all marketplaces. Accepts `null`
   * for callers that may pass a nullable DB value; the component handles
   * null / undefined / empty string the same way (renders nothing).
   */
  lastUpdated?: Date | string | null;
  trackerCount?: number;
  autoCheckFrequency?: string;
  className?: string;
}

/**
 * v1.5.24 — Render nothing if no real lastUpdated is provided. Previously
 * the fallback returned "baru saja" (just now) which is a lie when no
 * data exists. If the caller doesn't have real data, the bar should not
 * claim freshness.
 */
export function TrustSignalsBar({
  marketplaceCount,
  lastUpdated,
  trackerCount,
  autoCheckFrequency,
  className = "",
}: TrustSignalsBarProps) {
  if (!lastUpdated) {
    // No real data — don't render the freshness bar at all.
    // Callers should either provide a real lastUpdated or remove the bar.
    return null;
  }

  const formatLastUpdated = (date: Date | string) => {
    const now = new Date();
    const updated = typeof date === "string" ? new Date(date) : date;
    const diffMs = now.getTime() - updated.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "baru saja";
    if (diffMins < 60) return `${diffMins} menit lalu`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} jam lalu`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} hari lalu`;
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-muted/30 px-4 py-3 text-xs text-muted-foreground ${className}`}
    >
      <div className="flex items-center gap-1.5">
        <Database className="h-3.5 w-3.5 text-primary" />
        <span>
          Data dari <strong className="font-semibold text-foreground">{marketplaceCount}</strong> marketplace
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 text-primary" />
        <span>
          Update <strong className="font-semibold text-foreground">{formatLastUpdated(lastUpdated)}</strong>
        </span>
      </div>

      {trackerCount !== undefined && trackerCount > 0 && (
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-primary" />
          <span>
            <strong className="font-semibold text-foreground">{trackerCount}</strong> orang memantau
          </span>
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <RefreshCw className="h-3.5 w-3.5 text-primary" />
        <span>Dicek otomatis setiap {autoCheckFrequency}</span>
      </div>
    </div>
  );
}
