"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecheckPriceButtonProps {
  productId: string;
  marketplaceId?: string;
  className?: string;
}

export function RecheckPriceButton({
  productId,
  marketplaceId,
  className,
}: RecheckPriceButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleRecheck = async () => {
    setIsSubmitting(true);
    setStatus("idle");

    try {
      // TODO: Call recheck API after migration 110
      const response = await fetch("/api/recheck-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          marketplace_id: marketplaceId,
          reason: "user_requested",
        }),
      });

      if (response.ok) {
        setStatus("success");
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        setStatus("error");
      }
    } catch (error) {
      console.error("Recheck request failed:", error);
      setStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRecheck}
      disabled={isSubmitting || status === "success"}
      className={cn(className)}
    >
      <RefreshCw
        className={cn("mr-2 h-4 w-4", isSubmitting && "animate-spin")}
      />
      {status === "success"
        ? "Permintaan Dikirim"
        : status === "error"
        ? "Gagal"
        : "Cek Ulang Harga"}
    </Button>
  );
}
