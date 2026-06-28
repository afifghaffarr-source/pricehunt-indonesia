"use client";

import { useState } from "react";
import { Share2, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SocialShareProps {
  url: string;
  title: string;
  className?: string;
}

export function SocialShare({ url, title, className }: SocialShareProps) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const links = [
    {
      name: "WhatsApp",
      color: "bg-green-700 hover:bg-green-800",
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    },
    {
      name: "Twitter",
      color: "bg-sky-500 hover:bg-sky-600",
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    },
    {
      name: "Telegram",
      color: "bg-blue-500 hover:bg-blue-600",
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    },
  ];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Share2 className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Bagikan:</span>
      {links.map((link) => (
        <a
          key={link.name}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex h-8 items-center rounded-md px-3 text-xs font-medium text-white transition-colors",
            link.color
          )}
        >
          {link.name}
        </a>
      ))}
      <button
        onClick={copyLink}
        className="inline-flex h-8 items-center gap-1 rounded-md border px-3 text-xs font-medium transition-colors hover:bg-muted"
      >
        {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
        {copied ? "Tersalin!" : "Salin Link"}
      </button>
    </div>
  );
}
