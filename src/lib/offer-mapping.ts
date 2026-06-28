/**
 * Offer mapping helper: enrich product.prices rows with offer metadata.
 *
 * Extracted from src/app/product/[slug]/page.tsx (was 67 lines of inline mapping).
 * Pure: no I/O, no React, easy to unit test.
 */
import type { MarketplacePrice } from "@/lib/types";

// DB enum values mapped to component-friendly values
const VALIDATION_STATUS_MAP: Record<string, "verified" | "pending" | "rejected" | "flagged"> = {
  valid: "verified",
  conflict: "flagged",
  parser_error: "rejected",
  stale: "flagged",
  rejected: "rejected",
  pending: "pending",
};

const SOURCE_MAP: Record<string, "browser_collector" | "manual_admin" | "api_scraper"> = {
  official_api: "api_scraper",
  affiliate_feed: "api_scraper",
  browser_collector: "browser_collector",
  extension_snapshot: "browser_collector",
  targeted_crawler: "browser_collector",
  community_proof: "manual_admin",
  manual_admin: "manual_admin",
  api_scraper: "api_scraper",
};

export interface OfferRow {
  id: string;
  marketplace: string;
  confidence_score: number;
  confidence_label?: string;
  validation_status: string;
  last_checked_at: string;
  source: string;
}

/**
 * Pick the best matching offer for a given price row.
 * Prefer highest confidence_score, then most recent last_checked_at.
 */
function pickBestOffer(offers: OfferRow[], marketplace: string): OfferRow | undefined {
  const matching = offers.filter((o) => o.marketplace === marketplace);
  if (matching.length === 0) return undefined;
  return matching.sort((a, b) => {
    if (a.confidence_score !== b.confidence_score) {
      return b.confidence_score - a.confidence_score;
    }
    return new Date(b.last_checked_at).getTime() - new Date(a.last_checked_at).getTime();
  })[0];
}

/**
 * Enrich a list of MarketplacePrice rows with offer metadata where matches exist.
 * Falls back gracefully (no enrichment fields) when no matching offer.
 *
 * Return type is inferred so the output is structurally compatible with
 * EnhancedMarketplacePrice without requiring a cross-module type dependency.
 */
export function enrichPricesWithOffers(
  prices: MarketplacePrice[],
  offers: OfferRow[]
) {
  return prices.map((p) => {
    const offer = pickBestOffer(offers, p.marketplace);
    if (!offer) {
      return {
        ...p,
        offer_id: undefined,
        confidence_score: undefined,
        confidence_label: undefined,
        validation_status: undefined,
        last_seen_at: undefined,
        source: undefined,
      };
    }
    return {
      ...p,
      offer_id: offer.id,
      confidence_score: offer.confidence_score,
      confidence_label: offer.confidence_label,
      validation_status: VALIDATION_STATUS_MAP[offer.validation_status] || "pending",
      last_seen_at: offer.last_checked_at,
      source: SOURCE_MAP[offer.source] || "api_scraper",
    };
  });
}


