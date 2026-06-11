/**
 * Confidence Score Calculator for BijakBeli.app
 * 
 * Calculates confidence scores (0-100) for price data based on:
 * - Source type (official API > extension > scraper)
 * - Data freshness (recent > stale)
 * - Completeness (more fields = better)
 * - Trust signals (official store, cross-validation)
 * - Quality issues (conflicts, errors)
 * 
 * Used to help users understand reliability of price information.
 */

// ============================================================================
// TYPES
// ============================================================================

export type DataSourceType =
  | "official_api"
  | "affiliate_feed"
  | "extension_snapshot"
  | "targeted_scraper"
  | "community_proof"
  | "manual_admin";

export type ConfidenceLabel =
  | "sangat_dipercaya"
  | "dipercaya"
  | "cukup_dipercaya"
  | "perlu_dicek_ulang"
  | "data_belum_pasti";

export interface ConfidenceInput {
  sourceType: DataSourceType;
  capturedAt: Date;
  hasPrice: boolean;
  hasSeller?: boolean;
  hasStock?: boolean;
  hasVariant?: boolean;
  isOfficialStore?: boolean;
  crossValidated?: boolean;
  conflictDetected?: boolean;
  parserError?: boolean;
}

export interface ConfidenceResult {
  score: number;
  label: ConfidenceLabel;
  labelText: string;
  reasons: string[];
}

// ============================================================================
// BASE SCORES BY SOURCE TYPE
// ============================================================================

const SOURCE_BASE_SCORES: Record<DataSourceType, number> = {
  official_api: 95,
  manual_admin: 90,
  affiliate_feed: 85,
  extension_snapshot: 80,
  community_proof: 75,
  targeted_scraper: 70,
};

const SOURCE_LABELS: Record<DataSourceType, string> = {
  official_api: "API resmi marketplace",
  manual_admin: "Verifikasi admin",
  affiliate_feed: "Feed afiliasi",
  extension_snapshot: "Extension browser",
  community_proof: "Komunitas",
  targeted_scraper: "Scraper terpilih",
};

// ============================================================================
// CONFIDENCE CALCULATOR
// ============================================================================

/**
 * Calculate confidence score for price data
 * 
 * @param input - Confidence input parameters
 * @returns Confidence result with score, label, and reasons
 */
export function calculateConfidenceScore(input: ConfidenceInput): ConfidenceResult {
  const reasons: string[] = [];
  
  // Start with base score for source type
  let score = SOURCE_BASE_SCORES[input.sourceType] || 70;
  reasons.push(`Sumber: ${SOURCE_LABELS[input.sourceType] || input.sourceType}`);
  
  // ============================================================================
  // FRESHNESS PENALTY
  // ============================================================================
  
  const now = new Date();
  const hoursStale = (now.getTime() - input.capturedAt.getTime()) / (1000 * 60 * 60);
  const daysStale = hoursStale / 24;
  
  if (daysStale < 1) {
    // Fresh data bonus
    score += 5;
    reasons.push("Data sangat baru (< 24 jam)");
  } else if (daysStale < 3) {
    // Recent, no penalty
    reasons.push("Data masih segar (< 3 hari)");
  } else {
    // Apply freshness penalty: -5 per day, max -30
    const freshnessPenalty = Math.min(30, Math.floor(daysStale) * 5);
    score -= freshnessPenalty;
    
    if (daysStale < 7) {
      reasons.push(`Data agak lama (${Math.floor(daysStale)} hari)`);
    } else if (daysStale < 30) {
      reasons.push(`Data sudah lama (${Math.floor(daysStale)} hari)`);
    } else {
      reasons.push(`Data sangat lama (${Math.floor(daysStale)} hari)`);
    }
  }
  
  // ============================================================================
  // COMPLETENESS BONUS
  // ============================================================================
  
  if (!input.hasPrice) {
    // Critical: no price data
    score -= 10;
    reasons.push("⚠️ Harga tidak tersedia");
  }
  
  if (input.hasSeller) {
    score += 5;
    reasons.push("Informasi seller tersedia");
  }
  
  if (input.hasStock) {
    score += 5;
    reasons.push("Status stok tersedia");
  }
  
  if (input.hasVariant) {
    score += 3;
    reasons.push("Detail varian tersedia");
  }
  
  // ============================================================================
  // TRUST SIGNALS
  // ============================================================================
  
  if (input.isOfficialStore) {
    score += 10;
    reasons.push("✓ Official store");
  }
  
  if (input.crossValidated) {
    score += 15;
    reasons.push("✓ Dikonfirmasi dari beberapa sumber");
  }
  
  // ============================================================================
  // QUALITY ISSUES
  // ============================================================================
  
  if (input.parserError) {
    score -= 20;
    reasons.push("⚠️ Kesalahan parsing data");
  }
  
  if (input.conflictDetected) {
    score -= 15;
    reasons.push("⚠️ Perbedaan harga antar sumber terdeteksi");
  }
  
  // ============================================================================
  // CLAMP SCORE AND DETERMINE LABEL
  // ============================================================================
  
  // Ensure score is within 0-100 range
  score = Math.max(0, Math.min(100, Math.round(score)));
  
  const { label, labelText } = getConfidenceLabel(score);
  
  return {
    score,
    label,
    labelText,
    reasons,
  };
}

/**
 * Get confidence label based on score
 * 
 * @param score - Confidence score (0-100)
 * @returns Confidence label and text
 */
function getConfidenceLabel(score: number): { label: ConfidenceLabel; labelText: string } {
  if (score >= 85) {
    return {
      label: "sangat_dipercaya",
      labelText: "Sangat Dipercaya",
    };
  }
  
  if (score >= 70) {
    return {
      label: "dipercaya",
      labelText: "Dipercaya",
    };
  }
  
  if (score >= 55) {
    return {
      label: "cukup_dipercaya",
      labelText: "Cukup Dipercaya",
    };
  }
  
  if (score >= 40) {
    return {
      label: "perlu_dicek_ulang",
      labelText: "Perlu Dicek Ulang",
    };
  }
  
  return {
    label: "data_belum_pasti",
    labelText: "Data Belum Pasti",
  };
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Calculate confidence for an offer from database
 * Helper to work with existing offer data structure
 */
export function calculateOfferConfidence(offer: {
  source: string;
  last_checked_at: string | null;
  current_price: number;
  seller_name: string | null;
  stock_status: string;
  variant: string | null;
  is_official_store: boolean;
  confidence_score?: number | null;
}): ConfidenceResult {
  // Map source string to source type
  const sourceType = mapSourceStringToType(offer.source);
  
  // Determine if cross-validated (existing confidence score > 80 suggests this)
  const crossValidated = (offer.confidence_score || 0) > 80;
  
  return calculateConfidenceScore({
    sourceType,
    capturedAt: offer.last_checked_at ? new Date(offer.last_checked_at) : new Date(),
    hasPrice: offer.current_price > 0,
    hasSeller: !!offer.seller_name,
    hasStock: offer.stock_status !== "unknown",
    hasVariant: !!offer.variant,
    isOfficialStore: offer.is_official_store,
    crossValidated,
    conflictDetected: false, // Would need to query price_conflicts table
    parserError: false,
  });
}

/**
 * Map source string to DataSourceType
 */
function mapSourceStringToType(source: string): DataSourceType {
  const normalized = source.toLowerCase().trim();
  
  if (normalized.includes("admin")) return "manual_admin";
  if (normalized.includes("official") || normalized.includes("api")) return "official_api";
  if (normalized.includes("affiliate")) return "affiliate_feed";
  if (normalized.includes("extension")) return "extension_snapshot";
  if (normalized.includes("community")) return "community_proof";
  if (normalized.includes("scraper")) return "targeted_scraper";
  
  // Default
  return "extension_snapshot";
}

// ============================================================================
// BATCH CALCULATION
// ============================================================================

/**
 * Calculate confidence scores for multiple offers
 * Useful for bulk processing
 */
export function calculateBatchConfidence(
  offers: Array<{
    id: string;
    source: string;
    last_checked_at: string | null;
    current_price: number;
    seller_name: string | null;
    stock_status: string;
    variant: string | null;
    is_official_store: boolean;
  }>
): Map<string, ConfidenceResult> {
  const results = new Map<string, ConfidenceResult>();
  
  for (const offer of offers) {
    const confidence = calculateOfferConfidence(offer);
    results.set(offer.id, confidence);
  }
  
  return results;
}

// ============================================================================
// CONFIDENCE DEGRADATION HELPERS
// ============================================================================

/**
 * Check if confidence should be recalculated due to age
 * 
 * @param lastCalculated - When confidence was last calculated
 * @param currentScore - Current confidence score
 * @returns True if recalculation is recommended
 */
export function shouldRecalculateConfidence(
  lastCalculated: Date,
  currentScore: number
): boolean {
  const hoursSinceCalculation = (Date.now() - lastCalculated.getTime()) / (1000 * 60 * 60);
  
  // High confidence data: recheck every 7 days
  if (currentScore >= 85 && hoursSinceCalculation > 24 * 7) {
    return true;
  }
  
  // Medium confidence: recheck every 3 days
  if (currentScore >= 70 && hoursSinceCalculation > 24 * 3) {
    return true;
  }
  
  // Low confidence: recheck every day
  if (currentScore < 70 && hoursSinceCalculation > 24) {
    return true;
  }
  
  return false;
}

/**
 * Get recommended refresh interval based on confidence score
 * 
 * @param score - Current confidence score
 * @returns Recommended refresh interval in hours
 */
export function getRecommendedRefreshInterval(score: number): number {
  if (score >= 85) return 24 * 7; // 7 days
  if (score >= 70) return 24 * 3; // 3 days
  if (score >= 55) return 24;     // 1 day
  if (score >= 40) return 12;     // 12 hours
  return 6;                       // 6 hours for low confidence
}
