import { Tag } from "lucide-react";

export default function RootLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary animate-pulse">
          <Tag className="h-6 w-6 text-primary-foreground" />
        </div>
        <div className="space-y-2 text-center">
          <div className="h-4 w-32 animate-pulse rounded bg-muted mx-auto" />
          <div className="h-3 w-48 animate-pulse rounded bg-muted mx-auto" />
        </div>
      </div>
    </div>
  );
}
