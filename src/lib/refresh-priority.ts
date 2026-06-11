/**
 * Refresh Priority Calculator
 * 
 * Determines which products/offers should be refreshed first based on:
 * - Data staleness (age since last check)
 * - User engagement (wishlist, alerts, views)
 * - Price volatility (frequent changes)
 * - Marketplace importance (popular vs niche)
 * - Manual user requests (recheck_requests)
 * 
 * Returns a priority score (0-100) for each crawl target.
 */

interface RefreshFactors {
  // Data freshness
  hoursSinceLastCheck: number;
  
  // User engagement
  wishlistCount: number;
  activeAlertCount: number;
  viewsLast7Days: number;
  
  // Price behavior
  priceChangesLast30Days: number;
  priceVolatility: number; // 0-1, higher = more volatile
  
  // Business priority
  isPopularMarketplace: boolean;
  hasActivePromotion: boolean;
  
  // User requests
  hasOpenRecheckRequest: boolean;
  recheckRequestPriority?: "low" | "normal" | "high";
}

export interface PriorityResult {
  score: number; // 0-100
  reason: string;
  suggestedFrequency: number; // hours
}

/**
 * Calculate refresh priority score for a product/offer
 */
export function calculateRefreshPriority(factors: RefreshFactors): PriorityResult {
  let score = 0;
  const reasons: string[] = [];

  // 1. DATA STALENESS (0-30 points)
  // More stale = higher priority
  if (factors.hoursSinceLastCheck > 72) {
    score += 30;
    reasons.push("Data sangat lama (>3 hari)");
  } else if (factors.hoursSinceLastCheck > 48) {
    score += 20;
    reasons.push("Data lama (>2 hari)");
  } else if (factors.hoursSinceLastCheck > 24) {
    score += 10;
    reasons.push("Data perlu refresh");
  } else if (factors.hoursSinceLastCheck > 12) {
    score += 5;
    reasons.push("Data cukup fresh");
  }

  // 2. USER ENGAGEMENT (0-25 points)
  // More users watching = higher priority
  const totalEngagement = 
    factors.wishlistCount * 3 + 
    factors.activeAlertCount * 5 + 
    factors.viewsLast7Days * 0.1;
  
  if (totalEngagement > 100) {
    score += 25;
    reasons.push("Engagement sangat tinggi");
  } else if (totalEngagement > 50) {
    score += 20;
    reasons.push("Engagement tinggi");
  } else if (totalEngagement > 20) {
    score += 15;
    reasons.push("Engagement sedang");
  } else if (totalEngagement > 5) {
    score += 10;
    reasons.push("Ada engagement");
  }

  // 3. PRICE VOLATILITY (0-20 points)
  // Frequent price changes = check more often
  if (factors.priceChangesLast30Days > 10) {
    score += 20;
    reasons.push("Harga sering berubah");
  } else if (factors.priceChangesLast30Days > 5) {
    score += 15;
    reasons.push("Harga cukup dinamis");
  } else if (factors.priceChangesLast30Days > 2) {
    score += 10;
    reasons.push("Harga kadang berubah");
  }

  if (factors.priceVolatility > 0.3) {
    score += 10;
    reasons.push("Volatilitas tinggi");
  } else if (factors.priceVolatility > 0.15) {
    score += 5;
    reasons.push("Volatilitas sedang");
  }

  // 4. BUSINESS PRIORITY (0-15 points)
  if (factors.isPopularMarketplace) {
    score += 8;
    reasons.push("Marketplace populer");
  }

  if (factors.hasActivePromotion) {
    score += 7;
    reasons.push("Ada promosi aktif");
  }

  // 5. USER REQUESTS (0-10 points + BOOST)
  if (factors.hasOpenRecheckRequest) {
    if (factors.recheckRequestPriority === "high") {
      score += 30; // Significant boost
      reasons.push("Permintaan recheck HIGH");
    } else if (factors.recheckRequestPriority === "normal") {
      score += 20;
      reasons.push("Permintaan recheck user");
    } else {
      score += 10;
      reasons.push("Permintaan recheck LOW");
    }
  }

  // Cap at 100
  score = Math.min(score, 100);

  // Determine suggested refresh frequency based on score
  let suggestedFrequency: number;
  if (score >= 80) {
    suggestedFrequency = 1; // Every 1 hour
  } else if (score >= 60) {
    suggestedFrequency = 6; // Every 6 hours
  } else if (score >= 40) {
    suggestedFrequency = 12; // Every 12 hours
  } else if (score >= 20) {
    suggestedFrequency = 24; // Every 24 hours
  } else {
    suggestedFrequency = 48; // Every 48 hours
  }

  return {
    score,
    reason: reasons.join(", "),
    suggestedFrequency,
  };
}

/**
 * Determine next crawl time based on priority score
 */
export function calculateNextCrawlTime(
  lastCrawledAt: Date,
  priorityScore: number
): Date {
  const now = new Date();
  const hoursSinceLastCrawl = (now.getTime() - lastCrawledAt.getTime()) / (1000 * 60 * 60);

  let intervalHours: number;

  if (priorityScore >= 80) {
    intervalHours = 1; // Very high priority: hourly
  } else if (priorityScore >= 60) {
    intervalHours = 6; // High priority: 6 hours
  } else if (priorityScore >= 40) {
    intervalHours = 12; // Medium priority: twice daily
  } else if (priorityScore >= 20) {
    intervalHours = 24; // Low priority: daily
  } else {
    intervalHours = 48; // Very low priority: every 2 days
  }

  const nextCrawlTime = new Date(lastCrawledAt.getTime() + intervalHours * 60 * 60 * 1000);

  // If we're already past the next crawl time, return now
  if (nextCrawlTime < now) {
    return now;
  }

  return nextCrawlTime;
}

/**
 * Get crawl frequency label for display
 */
export function getCrawlFrequencyLabel(hours: number): string {
  if (hours <= 1) return "Setiap jam";
  if (hours <= 6) return "Setiap 6 jam";
  if (hours <= 12) return "Setiap 12 jam";
  if (hours <= 24) return "Setiap hari";
  return "Setiap 2 hari";
}
