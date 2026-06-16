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
      className: "bg-green-700 text-white hover:bg-green-800",
    },
    dipercaya: {
      icon: CheckCircle2,
      text: "Dipercaya",
      variant: "secondary" as const,
      className: "bg-blue-700 text-white hover:bg-blue-800",
    },
    perlu_verifikasi: {
      icon: AlertCircle,
      text: "Perlu Verifikasi",
      variant: "outline" as const,
      // amber-700 (≈#b45309) gives ~4.5:1+ on white/light-blue row bg;
      // amber-600 (#d97706) was failing WCAG 2.1 AA at 12px.
      className: "border-amber-500 text-amber-700",
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
