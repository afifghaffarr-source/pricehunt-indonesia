"use client";

import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfidenceBadgeProps {
  label: string; // 'tinggi', 'dipercaya', 'perlu_verifikasi'
  score?: number; // 0-100
  className?: string;
}

export function ConfidenceBadge({ label, score, className }: ConfidenceBadgeProps) {
  const config = {
    tinggi: {
      icon: CheckCircle2,
      text: "Tinggi",
      variant: "default" as const,
      className: "bg-green-500 text-white hover:bg-green-600",
    },
    dipercaya: {
      icon: CheckCircle2,
      text: "Dipercaya",
      variant: "secondary" as const,
      className: "bg-blue-500 text-white hover:bg-blue-600",
    },
    perlu_verifikasi: {
      icon: AlertCircle,
      text: "Perlu Verifikasi",
      variant: "outline" as const,
      className: "border-amber-500 text-amber-600",
    },
  };

  const item = config[label as keyof typeof config] || config.perlu_verifikasi;
  const Icon = item.icon;

  return (
    <Badge
      variant={item.variant}
      className={cn("flex items-center gap-1 text-xs", item.className, className)}
    >
      <Icon className="h-3 w-3" />
      {item.text}
      {score !== undefined && ` (${score})`}
    </Badge>
  );
}
