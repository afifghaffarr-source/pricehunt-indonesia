import { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";
import type { DealScoreInfo, Marketplace } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompactRupiah(amount: number): string {
  if (amount >= 1_000_000) {
    return `Rp${(amount / 1_000_000).toFixed(1)}jt`;
  }
  if (amount >= 1_000) {
    return `Rp${(amount / 1_000).toFixed(0)}rb`;
  }
  return `Rp${amount}`;
}

export function getDealScoreInfo(score: number): DealScoreInfo {
  if (score >= 85) {
    return {
      label: "Harga Terbaik",
      color: "text-white",
      bgColor: "bg-emerald-600",
      description: "Harga ini jauh di bawah rata-rata pasar!",
    };
  }
  if (score >= 70) {
    return {
      label: "Deal Bagus",
      color: "text-white",
      bgColor: "bg-green-500",
      description: "Harga lebih murah dari kebanyakan penjual.",
    };
  }
  if (score >= 50) {
    return {
      label: "Harga Wajar",
      color: "text-white",
      bgColor: "bg-amber-500",
      description: "Harga di sekitar rata-rata pasar.",
    };
  }
  return {
    label: "Mahal",
    color: "text-white",
    bgColor: "bg-red-500",
    description: "Harga ini di atas rata-rata pasar.",
  };
}

export function getMarketplaceColor(marketplace: Marketplace): string {
  const colors: Record<Marketplace, string> = {
    tokopedia: "#42b549",
    shopee: "#ee4d2d",
    bukalapak: "#e31e52",
    lazada: "#0f146d",
    blibli: "#0095da",
    tiktok: "#010101",
  };
  return colors[marketplace];
}

export function getMarketplaceName(marketplace: Marketplace): string {
  const names: Record<Marketplace, string> = {
    tokopedia: "Tokopedia",
    shopee: "Shopee",
    bukalapak: "Bukalapak",
    lazada: "Lazada",
    blibli: "Blibli",
    tiktok: "TikTok Shop",
  };
  return names[marketplace];
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function getDiscountPercent(lowest: number, highest: number): number {
  if (highest === 0) return 0;
  return Math.round(((highest - lowest) / highest) * 100);
}
