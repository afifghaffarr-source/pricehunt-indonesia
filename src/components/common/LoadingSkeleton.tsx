import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  count?: number;
  variant?: "card" | "table" | "detail";
  className?: string;
}

export function LoadingSkeleton({
  count = 4,
  variant = "card",
  className,
}: LoadingSkeletonProps) {
  if (variant === "card") {
    return (
      <div
        className={cn(
          "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
          className
        )}
      >
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <Skeleton className="h-48 w-full rounded-md" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className={cn("space-y-3", className)}>
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      <Skeleton className="h-64 w-full rounded-lg" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}
