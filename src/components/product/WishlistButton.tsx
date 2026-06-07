"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toggleWishlist } from "@/app/actions/data";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface WishlistButtonProps {
  productId: string;
  initialIsWishlisted: boolean;
  className?: string;
}

export function WishlistButton({
  productId,
  initialIsWishlisted,
  className,
}: WishlistButtonProps) {
  const [isWishlisted, setIsWishlisted] = useState(initialIsWishlisted);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      const result = await toggleWishlist(productId);
      if (result.error) {
        if (result.error.includes("login")) {
          router.push("/auth/login");
          return;
        }
        setError(result.error);
      } else if (result.success) {
        setIsWishlisted(result.action === "added");
      }
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={cn(
          "inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition-all",
          isWishlisted
            ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
            : "border-border bg-background text-foreground hover:bg-muted",
          isPending && "opacity-50 cursor-wait",
          className
        )}
      >
        <Heart
          className={cn(
            "mr-2 h-4 w-4",
            isWishlisted && "fill-current"
          )}
        />
        {isWishlisted ? "Tersimpan" : "Simpan"}
      </button>
      {error && (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
