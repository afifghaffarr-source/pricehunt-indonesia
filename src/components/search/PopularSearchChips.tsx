"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PopularSearchChipsProps {
  searches: string[];
  className?: string;
}

export function PopularSearchChips({
  searches,
  className,
}: PopularSearchChipsProps) {
  const router = useRouter();

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {searches.map((term) => (
        <Badge
          key={term}
          variant="secondary"
          className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
          onClick={() =>
            router.push(`/search?q=${encodeURIComponent(term)}`)
          }
        >
          {term}
        </Badge>
      ))}
    </div>
  );
}
