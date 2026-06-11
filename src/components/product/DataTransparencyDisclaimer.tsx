"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataTransparencyDisclaimerProps {
  className?: string;
  variant?: "default" | "compact";
}

export function DataTransparencyDisclaimer({
  className,
  variant = "default",
}: DataTransparencyDisclaimerProps) {
  if (variant === "compact") {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        <Info className="inline h-3 w-3 mr-1" />
        Data harga dikumpulkan secara berkala. Harga aktual di marketplace dapat
        berbeda.
      </p>
    );
  }

  return (
    <Alert className={cn("border-blue-200 bg-blue-50", className)}>
      <Info className="h-4 w-4 text-blue-600" />
      <AlertDescription className="text-xs text-blue-900">
        <strong className="font-semibold">Tentang Data Kami:</strong> Kami
        mengumpulkan harga secara berkala dari berbagai marketplace. Harga,
        stok, dan promosi dapat berubah sewaktu-waktu. Selalu konfirmasi harga
        final di marketplace sebelum membeli. Kami tidak bertanggung jawab atas
        perbedaan harga atau ketidaktersediaan produk.
      </AlertDescription>
    </Alert>
  );
}
