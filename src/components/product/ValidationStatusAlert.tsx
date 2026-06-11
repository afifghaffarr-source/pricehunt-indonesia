"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, XCircle, Clock } from "lucide-react";

interface ValidationStatusAlertProps {
  status: "pending" | "verified" | "flagged" | "rejected";
  productName: string;
}

export function ValidationStatusAlert({
  status,
  productName,
}: ValidationStatusAlertProps) {
  if (status === "verified") return null; // Don't show alert for verified items

  const config = {
    pending: {
      icon: Clock,
      variant: "default" as const,
      title: "Sedang Diverifikasi",
      description: "Harga produk ini sedang dalam proses verifikasi oleh tim kami.",
    },
    flagged: {
      icon: AlertTriangle,
      variant: "destructive" as const,
      title: "Perlu Perhatian",
      description:
        "Harga produk ini ditandai untuk review lebih lanjut. Data mungkin tidak akurat.",
    },
    rejected: {
      icon: XCircle,
      variant: "destructive" as const,
      title: "Data Tidak Valid",
      description:
        "Harga produk ini tidak dapat diverifikasi. Silakan gunakan sumber lain.",
    },
  };

  const item = config[status];
  if (!item) return null;

  const Icon = item.icon;

  return (
    <Alert variant={item.variant} className="mb-4">
      <Icon className="h-4 w-4" />
      <AlertTitle>{item.title}</AlertTitle>
      <AlertDescription>{item.description}</AlertDescription>
    </Alert>
  );
}
