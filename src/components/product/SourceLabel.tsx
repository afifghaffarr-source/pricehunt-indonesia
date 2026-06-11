"use client";

import { Badge } from "@/components/ui/badge";
import { Globe, User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface SourceLabelProps {
  source: "browser_collector" | "manual_admin" | "api_scraper";
  className?: string;
}

export function SourceLabel({ source, className }: SourceLabelProps) {
  const config = {
    browser_collector: {
      icon: Globe,
      text: "Browser",
      className: "bg-blue-100 text-blue-700 border-blue-300",
    },
    manual_admin: {
      icon: User,
      text: "Manual",
      className: "bg-purple-100 text-purple-700 border-purple-300",
    },
    api_scraper: {
      icon: Bot,
      text: "Auto",
      className: "bg-gray-100 text-gray-700 border-gray-300",
    },
  };

  const item = config[source] || config.api_scraper;
  const Icon = item.icon;

  return (
    <Badge
      variant="outline"
      className={cn("flex items-center gap-1 text-xs", item.className, className)}
    >
      <Icon className="h-3 w-3" />
      {item.text}
    </Badge>
  );
}
