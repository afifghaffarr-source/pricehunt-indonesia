export default function Loading() {
  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header skeleton */}
        <div className="space-y-2">
          <div className="h-8 w-3/4 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        </div>

        {/* Content skeleton */}
        <div className="space-y-3">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
          <div className="h-4 w-4/6 animate-pulse rounded bg-muted" />
        </div>

        {/* Card skeleton */}
        <div className="rounded-2xl border border-border/50 p-6 space-y-4">
          <div className="h-6 w-1/3 animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
          <div className="h-10 w-2/3 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    </div>
  )
}
