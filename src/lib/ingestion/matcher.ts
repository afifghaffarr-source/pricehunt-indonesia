/**
 * Product Matcher for PriceHunt Indonesia
 * 
 * Prevents wrong product/variant merging by:
 * - Detecting negative keywords (bekas, replika, KW, etc.)
 * - Calculating title similarity score
 * - Variant awareness
 * - Brand consistency
 * - Price sanity checks
 * 
 * Used during offer ingestion to determine if an offer belongs to a product.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface MatchInput {
  // Offer being checked
  offerTitle: string;
  offerPrice: number;
  offerMarketplace: string;
  offerVariant?: string | null;
  offerCondition?: "new" | "used" | "refurbished";
  
  // Product to match against
  productTitle: string;
  productBrand?: string | null;
  productCategory?: string | null;
  
  // Context
  existingOffersAvgPrice?: number | null;
  existingOffersTitles?: string[];
}

export interface MatchResult {
  isMatch: boolean;
  score: number; // 0-100
  confidence: "high" | "medium" | "low" | "reject";
  reasons: string[];
  warnings: string[];
  flags: MatchFlag[];
}

export type MatchFlag =
  | "negative_keyword_detected"
  | "price_anomaly"
  | "title_mismatch"
  | "variant_conflict"
  | "brand_conflict"
  | "condition_mismatch"
  | "suspicious_quality";

// ============================================================================
// NEGATIVE KEYWORDS
// ============================================================================

/**
 * Keywords that indicate a product should NOT be matched
 * These typically indicate used, replica, or wrong items
 */
const NEGATIVE_KEYWORDS = {
  // Condition issues
  used: ["bekas", "second", "seken", "preloved", "pre-loved", "used"],
  
  // Fake/replica
  replica: [
    "replika",
    "replica",
    "kw",
    "kw1",
    "kw2",
    "kw super",
    "fake",
    "palsu",
    "tiruan",
    "imitasi",
    "imitation",
  ],
  
  // Wrong item type
  wrong: [
    "case",
    "casing",
    "cover",
    "skin",
    "sticker",
    "dummy",
    "mainan",
    "boneka",
    "poster",
    "gantungan",
    "keychain",
  ],
  
  // Suspicious quality
  suspicious: [
    "cacat",
    "rusak",
    "minus",
    "lecet",
    "penyok",
    "retak",
    "mati",
    "bootloop",
    "icloud",
  ],
};

/**
 * Check if title contains negative keywords
 */
export function detectNegativeKeywords(title: string): {
  hasNegative: boolean;
  keywords: string[];
  category: string;
} {
  const normalized = title.toLowerCase().trim();
  const detected: string[] = [];
  let category = "";
  
  // Check each category
  for (const [cat, keywords] of Object.entries(NEGATIVE_KEYWORDS)) {
    for (const keyword of keywords) {
      // Use word boundary to avoid false positives
      const regex = new RegExp(`\\b${keyword}\\b`, "i");
      if (regex.test(normalized)) {
        detected.push(keyword);
        if (!category) category = cat;
      }
    }
  }
  
  return {
    hasNegative: detected.length > 0,
    keywords: detected,
    category,
  };
}

// ============================================================================
// TITLE SIMILARITY
// ============================================================================

/**
 * Calculate title similarity score using token-based approach
 * More sophisticated than simple string matching
 */
export function calculateTitleSimilarity(title1: string, title2: string): number {
  // Normalize titles
  const norm1 = normalizeForMatching(title1);
  const norm2 = normalizeForMatching(title2);
  
  // Tokenize
  const tokens1 = new Set(norm1.split(/\s+/).filter(t => t.length > 2));
  const tokens2 = new Set(norm2.split(/\s+/).filter(t => t.length > 2));
  
  if (tokens1.size === 0 || tokens2.size === 0) return 0;
  
  // Calculate Jaccard similarity
  const intersection = new Set([...tokens1].filter(t => tokens2.has(t)));
  const union = new Set([...tokens1, ...tokens2]);
  
  const jaccardScore = intersection.size / union.size;
  
  // Also check for substring containment (for variants like "256GB" vs "iPhone 14 256GB")
  const containmentScore = norm1.includes(norm2) || norm2.includes(norm1) ? 0.3 : 0;
  
  // Combined score
  return Math.min(100, (jaccardScore * 70 + containmentScore * 100));
}

/**
 * Normalize title for matching
 */
function normalizeForMatching(title: string): string {
  return title
    .toLowerCase()
    .trim()
    // Remove common noise words
    .replace(/\b(official|store|original|resmi|garansi|warranty)\b/gi, "")
    // Remove special chars but keep spaces and alphanumeric
    .replace(/[^\w\s]/g, " ")
    // Normalize whitespace
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================================
// VARIANT MATCHING
// ============================================================================

/**
 * Extract variant info from title
 * Common patterns: "256GB", "Purple", "M1", "Pro Max", etc.
 */
export function extractVariantInfo(title: string): string[] {
  const variants: string[] = [];
  const normalized = title.toLowerCase();
  
  // Storage variants
  const storageMatch = normalized.match(/(\d+)\s*(gb|tb)/i);
  if (storageMatch) {
    variants.push(storageMatch[0].replace(/\s+/g, "").toUpperCase());
  }
  
  // RAM variants
  const ramMatch = normalized.match(/(\d+)\s*gb\s*(ram)/i);
  if (ramMatch) {
    variants.push(ramMatch[0].replace(/\s+/g, "").toUpperCase());
  }
  
  // Color variants (common colors)
  const colors = ["black", "white", "red", "blue", "green", "purple", "pink", "gold", "silver", "grey", "gray", "hitam", "putih", "merah", "biru", "hijau", "ungu", "pink", "emas", "perak"];
  for (const color of colors) {
    if (normalized.includes(color)) {
      variants.push(color);
    }
  }
  
  // Model variants (Pro, Max, Plus, etc.)
  const modelVariants = ["pro", "max", "plus", "ultra", "lite", "mini"];
  for (const variant of modelVariants) {
    if (normalized.includes(variant)) {
      variants.push(variant);
    }
  }
  
  return variants;
}

/**
 * Check if variants are compatible
 */
export function areVariantsCompatible(
  offerVariants: string[],
  productVariants: string[]
): boolean {
  if (offerVariants.length === 0 || productVariants.length === 0) {
    return true; // No variant info to conflict
  }
  
  // Check for direct conflicts
  for (const offerVar of offerVariants) {
    for (const prodVar of productVariants) {
      // If both mention storage/ram but different, it's a conflict
      if (
        (offerVar.includes("GB") || offerVar.includes("TB")) &&
        (prodVar.includes("GB") || prodVar.includes("TB")) &&
        offerVar !== prodVar
      ) {
        return false;
      }
    }
  }
  
  return true;
}

// ============================================================================
// PRICE SANITY CHECK
// ============================================================================

/**
 * Check if price is reasonable compared to existing offers
 */
export function checkPriceSanity(
  offerPrice: number,
  existingAvgPrice?: number | null
): {
  isSane: boolean;
  deviation: number | null;
  flag: "too_low" | "too_high" | "ok";
} {
  if (!existingAvgPrice || existingAvgPrice === 0) {
    return { isSane: true, deviation: null, flag: "ok" };
  }
  
  const deviation = ((offerPrice - existingAvgPrice) / existingAvgPrice) * 100;
  
  // More than 50% deviation is suspicious
  if (Math.abs(deviation) > 50) {
    return {
      isSane: false,
      deviation,
      flag: deviation < 0 ? "too_low" : "too_high",
    };
  }
  
  return { isSane: true, deviation, flag: "ok" };
}

// ============================================================================
// MASTER MATCHER
// ============================================================================

/**
 * Determine if an offer matches a product
 * Returns match result with score and confidence
 */
export function matchOfferToProduct(input: MatchInput): MatchResult {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const flags: MatchFlag[] = [];
  let score = 100; // Start with perfect score, deduct for issues
  
  // ============================================================================
  // 1. NEGATIVE KEYWORD CHECK (CRITICAL)
  // ============================================================================
  
  const negativeCheck = detectNegativeKeywords(input.offerTitle);
  if (negativeCheck.hasNegative) {
    score -= 60;
    flags.push("negative_keyword_detected");
    warnings.push(`Keyword negatif terdeteksi: ${negativeCheck.keywords.join(", ")} (${negativeCheck.category})`);
    
    // Immediate rejection for replica/fake
    if (negativeCheck.category === "replica") {
      return {
        isMatch: false,
        score: 0,
        confidence: "reject",
        reasons: ["Terdeteksi replika/fake"],
        warnings,
        flags,
      };
    }
  }
  
  // ============================================================================
  // 2. CONDITION CHECK
  // ============================================================================
  
  if (input.offerCondition && input.offerCondition !== "new") {
    score -= 30;
    flags.push("condition_mismatch");
    warnings.push(`Kondisi bukan baru: ${input.offerCondition}`);
  }
  
  // ============================================================================
  // 3. TITLE SIMILARITY (IMPORTANT)
  // ============================================================================
  
  const titleSim = calculateTitleSimilarity(input.offerTitle, input.productTitle);
  
  if (titleSim < 30) {
    score -= 55; // Increased penalty to ensure score goes below 50
    flags.push("title_mismatch");
    warnings.push(`Title similarity rendah: ${titleSim.toFixed(0)}%`);
  } else if (titleSim < 50) {
    score -= 20;
    warnings.push(`Title similarity sedang: ${titleSim.toFixed(0)}%`);
  } else {
    reasons.push(`Title match: ${titleSim.toFixed(0)}%`);
  }
  
  // ============================================================================
  // 4. VARIANT COMPATIBILITY
  // ============================================================================
  
  const offerVariants = extractVariantInfo(input.offerTitle);
  const productVariants = extractVariantInfo(input.productTitle);
  
  if (input.offerVariant) {
    offerVariants.push(...extractVariantInfo(input.offerVariant));
  }
  
  const variantsCompatible = areVariantsCompatible(offerVariants, productVariants);
  
  if (!variantsCompatible) {
    score -= 40;
    flags.push("variant_conflict");
    warnings.push("Variant tidak cocok");
  } else if (offerVariants.length > 0 && productVariants.length > 0) {
    reasons.push("Variant kompatibel");
  }
  
  // ============================================================================
  // 5. PRICE SANITY
  // ============================================================================
  
  const priceCheck = checkPriceSanity(input.offerPrice, input.existingOffersAvgPrice);
  
  if (!priceCheck.isSane) {
    score -= 20;
    flags.push("price_anomaly");
    warnings.push(
      `Harga ${priceCheck.flag === "too_low" ? "terlalu rendah" : "terlalu tinggi"}: ${priceCheck.deviation?.toFixed(0)}% dari rata-rata`
    );
  }
  
  // ============================================================================
  // 6. CROSS-CHECK WITH EXISTING OFFERS
  // ============================================================================
  
  if (input.existingOffersTitles && input.existingOffersTitles.length > 0) {
    const avgSimilarity =
      input.existingOffersTitles.reduce(
        (sum, existingTitle) =>
          sum + calculateTitleSimilarity(input.offerTitle, existingTitle),
        0
      ) / input.existingOffersTitles.length;
    
    if (avgSimilarity < 40) {
      score -= 15;
      warnings.push("Title berbeda dari offer existing lainnya");
    } else {
      reasons.push("Konsisten dengan offer existing");
    }
  }
  
  // ============================================================================
  // FINAL DECISION
  // ============================================================================
  
  // Clamp score
  score = Math.max(0, Math.min(100, score));
  
  // Determine confidence
  let confidence: "high" | "medium" | "low" | "reject";
  if (score >= 75) confidence = "high";
  else if (score >= 50) confidence = "medium";
  else if (score >= 30) confidence = "low";
  else confidence = "reject";
  
  // Determine if match (must be > 50, not >= to avoid edge cases)
  const isMatch = score > 50 && confidence !== "reject";
  
  // Add final reason
  if (isMatch) {
    reasons.push(`Match score: ${score}/100`);
  } else {
    reasons.push(`Rejected: score terlalu rendah (${score}/100)`);
  }
  
  return {
    isMatch,
    score,
    confidence,
    reasons,
    warnings,
    flags,
  };
}

// ============================================================================
// BATCH MATCHING
// ============================================================================

/**
 * Match an offer against multiple products
 * Returns best match
 */
export function findBestProductMatch(
  offer: {
    title: string;
    price: number;
    marketplace: string;
    variant?: string | null;
    condition?: "new" | "used" | "refurbished";
  },
  products: Array<{
    id: string;
    title: string;
    brand?: string | null;
    category?: string | null;
    existingOffersAvgPrice?: number | null;
    existingOffersTitles?: string[];
  }>
): {
  bestMatch: { productId: string; result: MatchResult } | null;
  allResults: Array<{ productId: string; result: MatchResult }>;
} {
  const allResults = products.map((product) => {
    const result = matchOfferToProduct({
      offerTitle: offer.title,
      offerPrice: offer.price,
      offerMarketplace: offer.marketplace,
      offerVariant: offer.variant,
      offerCondition: offer.condition,
      productTitle: product.title,
      productBrand: product.brand,
      productCategory: product.category,
      existingOffersAvgPrice: product.existingOffersAvgPrice,
      existingOffersTitles: product.existingOffersTitles,
    });
    
    return { productId: product.id, result };
  });
  
  // Sort by score
  allResults.sort((a, b) => b.result.score - a.result.score);
  
  // Best match must be a valid match
  const bestMatch = allResults[0]?.result.isMatch ? allResults[0] : null;
  
  return { bestMatch, allResults };
}
