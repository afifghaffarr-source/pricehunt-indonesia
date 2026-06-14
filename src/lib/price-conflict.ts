/**
 * Price Conflict Detection
 * 
 * Identifies inconsistencies in price data:
 * - Same product from same marketplace at different times with huge differences
 * - Same product across marketplaces with suspicious patterns
 * - Fake discount detection integration
 * 
 * Used to flag data for review and improve data quality.
 */

interface PriceSnapshot {
  offer_id: string;
  price: number;
  original_price?: number;
  captured_at: string;
  source: "browser_collector" | "manual_admin" | "api_scraper";
  confidence_score: number;
}

interface ConflictResult {
  hasConflict: boolean;
  severity: "low" | "medium" | "high";
  reason: string;
  affectedOffers: string[];
  suggestedAction: "review" | "recheck" | "flag";
}

/**
 * Detect price conflicts within a product
 */
export function detectPriceConflicts(
  snapshots: PriceSnapshot[],
  _productId: string
): ConflictResult {
  if (snapshots.length < 2) {
    return {
      hasConflict: false,
      severity: "low",
      reason: "Tidak cukup data untuk perbandingan",
      affectedOffers: [],
      suggestedAction: "review",
    };
  }

  // Sort by captured_at descending (newest first)
  const sorted = [...snapshots].sort(
    (a, b) => new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime()
  );

  // Group by offer_id
  const byOffer = new Map<string, PriceSnapshot[]>();
  for (const snapshot of sorted) {
    const existing = byOffer.get(snapshot.offer_id) || [];
    existing.push(snapshot);
    byOffer.set(snapshot.offer_id, existing);
  }

  // Check for conflicts
  const conflicts: string[] = [];
  let maxSeverity: "low" | "medium" | "high" = "low";
  const reasons: string[] = [];

  for (const [offerId, offerSnapshots] of byOffer.entries()) {
    if (offerSnapshots.length < 2) continue;

    const latest = offerSnapshots[0];
    const previous = offerSnapshots[1];

    // Calculate price change percentage
    const priceChange = Math.abs(latest.price - previous.price) / previous.price;

    // 1. HUGE PRICE JUMP (>50% in short time)
    const timeDiff =
      new Date(latest.captured_at).getTime() - new Date(previous.captured_at).getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (priceChange > 0.5 && hoursDiff < 24) {
      conflicts.push(offerId);
      maxSeverity = "high";
      reasons.push(
        `Lonjakan harga ${(priceChange * 100).toFixed(0)}% dalam ${hoursDiff.toFixed(0)} jam`
      );
    } else if (priceChange > 0.3 && hoursDiff < 12) {
      conflicts.push(offerId);
      maxSeverity = maxSeverity === "high" ? "high" : "medium";
      reasons.push(
        `Perubahan harga ${(priceChange * 100).toFixed(0)}% dalam waktu singkat`
      );
    }

    // 2. CONFIDENCE MISMATCH
    if (latest.confidence_score < 50 && previous.confidence_score > 80) {
      conflicts.push(offerId);
      maxSeverity = maxSeverity === "high" ? "high" : "medium";
      reasons.push("Confidence drop signifikan");
    }

    // 3. SOURCE QUALITY CONFLICT
    // Manual admin data is most trusted, followed by browser, then API
    const sourceRank = {
      manual_admin: 3,
      browser_collector: 2,
      api_scraper: 1,
    };

    if (
      sourceRank[latest.source] < sourceRank[previous.source] &&
      priceChange > 0.2
    ) {
      conflicts.push(offerId);
      maxSeverity = maxSeverity === "high" ? "high" : "medium";
      reasons.push("Data sumber berkualitas rendah dengan perbedaan harga");
    }

    // 4. FAKE DISCOUNT PATTERN
    if (latest.original_price && previous.original_price) {
      const originalChange =
        Math.abs(latest.original_price - previous.original_price) /
        previous.original_price;

      // Original price suddenly inflated
      if (originalChange > 0.5 && latest.original_price > previous.original_price) {
        conflicts.push(offerId);
        maxSeverity = "high";
        reasons.push("Harga coret tiba-tiba naik drastis (kemungkinan diskon palsu)");
      }
    }
  }

  // 5. CROSS-MARKETPLACE ANOMALIES
  // Same product shouldn't have 3x price difference across marketplaces
  const latestPrices = Array.from(byOffer.values()).map((s) => s[0].price);
  if (latestPrices.length > 1) {
    const minPrice = Math.min(...latestPrices);
    const maxPrice = Math.max(...latestPrices);
    const ratio = maxPrice / minPrice;

    if (ratio > 3) {
      maxSeverity = "high";
      reasons.push(
        `Perbedaan harga antar marketplace ${ratio.toFixed(1)}x (kemungkinan error data)`
      );
    } else if (ratio > 2) {
      maxSeverity = maxSeverity === "high" ? "high" : "medium";
      reasons.push(`Perbedaan harga antar marketplace cukup besar (${ratio.toFixed(1)}x)`);
    }
  }

  const hasConflict = conflicts.length > 0 || reasons.length > 0;

  let suggestedAction: "review" | "recheck" | "flag";
  if (maxSeverity === "high") {
    suggestedAction = "flag";
  } else if (maxSeverity === "medium") {
    suggestedAction = "recheck";
  } else {
    suggestedAction = "review";
  }

  return {
    hasConflict,
    severity: maxSeverity,
    reason: reasons.join("; "),
    affectedOffers: [...new Set(conflicts)],
    suggestedAction,
  };
}

/**
 * Calculate price volatility score (0-1)
 * Higher = more volatile
 */
export function calculatePriceVolatility(prices: number[]): number {
  if (prices.length < 2) return 0;

  const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const variance =
    prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);

  // Coefficient of variation (normalized volatility)
  const cv = stdDev / mean;

  // Cap at 1.0
  return Math.min(cv, 1.0);
}

/**
 * Suggest resolution for a price conflict
 */
export function suggestConflictResolution(
  snapshots: PriceSnapshot[]
): { action: string; reason: string } {
  if (snapshots.length === 0) {
    return {
      action: "no_action",
      reason: "Tidak ada data",
    };
  }

  // Sort by confidence + recency
  const scored = snapshots.map((s) => ({
    snapshot: s,
    score:
      s.confidence_score * 0.7 +
      (new Date(s.captured_at).getTime() / Date.now()) * 0.3 * 100,
  }));

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0].snapshot;

  // Manual admin data always wins
  if (best.source === "manual_admin") {
    return {
      action: "keep_manual",
      reason: "Data manual admin paling dipercaya",
    };
  }

  // High confidence recent data wins
  if (best.confidence_score >= 80) {
    return {
      action: "keep_best",
      reason: `Data dengan confidence tertinggi (${best.confidence_score})`,
    };
  }

  // Otherwise, recheck needed
  return {
    action: "recheck_all",
    reason: "Tidak ada data dengan confidence tinggi, perlu pengecekan ulang",
  };
}
