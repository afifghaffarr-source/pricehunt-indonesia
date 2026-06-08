/**
 * Deal Score Engine
 * 
 * Calculates a comprehensive deal score (0-100) for product offers
 * based on multiple factors to help users make informed buying decisions.
 * 
 * Score Breakdown:
 * - 35%: Historical discount vs 90-day median
 * - 20%: Price percentile vs history
 * - 15%: Seller trust/reputation
 * - 10%: Official store verification
 * - 10%: Stock confidence
 * - 10%: Shipping/voucher advantage
 */

export interface DealScoreInput {
  // Price data
  currentPrice: number;
  originalPrice?: number;
  lowestHistoricalPrice?: number;
  median30Day?: number;
  median90Day?: number;
  
  // Seller data
  sellerRating?: number; // 0-5
  sellerReviewCount?: number;
  isOfficialStore?: boolean;
  
  // Stock & availability
  stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'unknown';
  
  // Shipping & promotions
  hasVoucher?: boolean;
  hasFreeShipping?: boolean;
}

export interface DealScoreOutput {
  // Overall score
  score: number; // 0-100
  label: DealScoreLabel;
  color: 'green' | 'yellow' | 'orange' | 'red' | 'gray';
  
  // Detailed breakdown
  breakdown: {
    priceDiscount: number; // 0-35
    pricePercentile: number; // 0-20
    sellerTrust: number; // 0-15
    officialStore: number; // 0-10
    stockConfidence: number; // 0-10
    promotions: number; // 0-10
  };
  
  // Explanation for users
  explanation: string[];
  
  // Risk flags
  risks: string[];
  
  // Confidence in the score
  confidence: 'high' | 'medium' | 'low';
}

export type DealScoreLabel = 
  | 'Beli sekarang'
  | 'Harga bagus'
  | 'Tunggu turun'
  | 'Diskon mencurigakan'
  | 'Murah tapi berisiko'
  | 'Data belum cukup';

/**
 * Calculate comprehensive deal score
 */
export function calculateDealScore(input: DealScoreInput): DealScoreOutput {
  const breakdown = {
    priceDiscount: calculatePriceDiscountScore(input),
    pricePercentile: calculatePricePercentileScore(input),
    sellerTrust: calculateSellerTrustScore(input),
    officialStore: calculateOfficialStoreScore(input),
    stockConfidence: calculateStockConfidenceScore(input),
    promotions: calculatePromotionsScore(input),
  };

  const totalScore = Math.round(
    breakdown.priceDiscount +
    breakdown.pricePercentile +
    breakdown.sellerTrust +
    breakdown.officialStore +
    breakdown.stockConfidence +
    breakdown.promotions
  );

  const risks = identifyRisks(input, breakdown);
  const confidence = assessConfidence(input);
  const label = determineLabel(totalScore, risks, confidence);
  const color = determineLabelColor(label);
  const explanation = generateExplanation(input, breakdown, risks);

  return {
    score: totalScore,
    label,
    color,
    breakdown,
    explanation,
    risks,
    confidence,
  };
}

/**
 * Calculate score based on historical discount (0-35 points)
 */
function calculatePriceDiscountScore(input: DealScoreInput): number {
  const { currentPrice, median90Day, lowestHistoricalPrice } = input;
  
  // Need historical data for this score
  if (!median90Day) return 0;

  // Calculate discount from 90-day median
  const discountPercent = ((median90Day - currentPrice) / median90Day) * 100;
  
  // Score based on discount percentage
  // 20%+ discount = full 35 points
  // 10-20% discount = 25-35 points
  // 5-10% discount = 15-25 points
  // 0-5% discount = 0-15 points
  // Above median = 0 points
  
  if (discountPercent >= 20) return 35;
  if (discountPercent >= 10) return 25 + ((discountPercent - 10) / 10) * 10;
  if (discountPercent >= 5) return 15 + ((discountPercent - 5) / 5) * 10;
  if (discountPercent > 0) return (discountPercent / 5) * 15;
  
  return 0;
}

/**
 * Calculate score based on price position vs history (0-20 points)
 */
function calculatePricePercentileScore(input: DealScoreInput): number {
  const { currentPrice, lowestHistoricalPrice, median90Day } = input;
  
  // Need both lowest and median for comparison
  if (!lowestHistoricalPrice || !median90Day) return 0;
  
  const range = median90Day - lowestHistoricalPrice;
  if (range <= 0) return 10; // Price is stable
  
  // Calculate where current price sits in the range
  const positionInRange = (median90Day - currentPrice) / range;
  
  // If at or below lowest historical = 20 points
  // If at median = 10 points
  // If above median = 0 points
  
  if (currentPrice <= lowestHistoricalPrice) return 20;
  if (currentPrice >= median90Day) return 0;
  
  return Math.round(10 + (positionInRange * 10));
}

/**
 * Calculate score based on seller trust (0-15 points)
 */
function calculateSellerTrustScore(input: DealScoreInput): number {
  const { sellerRating, sellerReviewCount } = input;
  
  if (!sellerRating || !sellerReviewCount) return 0;
  
  // Rating score (0-10 points)
  // 4.5+ stars = 10 points
  // 4.0-4.5 = 7 points
  // 3.5-4.0 = 5 points
  // 3.0-3.5 = 3 points
  // <3.0 = 0 points
  
  let ratingScore = 0;
  if (sellerRating >= 4.5) ratingScore = 10;
  else if (sellerRating >= 4.0) ratingScore = 7;
  else if (sellerRating >= 3.5) ratingScore = 5;
  else if (sellerRating >= 3.0) ratingScore = 3;
  
  // Review count score (0-5 points)
  // 1000+ reviews = 5 points
  // 500-1000 = 4 points
  // 100-500 = 3 points
  // 50-100 = 2 points
  // 10-50 = 1 point
  // <10 = 0 points
  
  let reviewScore = 0;
  if (sellerReviewCount >= 1000) reviewScore = 5;
  else if (sellerReviewCount >= 500) reviewScore = 4;
  else if (sellerReviewCount >= 100) reviewScore = 3;
  else if (sellerReviewCount >= 50) reviewScore = 2;
  else if (sellerReviewCount >= 10) reviewScore = 1;
  
  return ratingScore + reviewScore;
}

/**
 * Calculate score for official store status (0-10 points)
 */
function calculateOfficialStoreScore(input: DealScoreInput): number {
  return input.isOfficialStore ? 10 : 0;
}

/**
 * Calculate score based on stock availability (0-10 points)
 */
function calculateStockConfidenceScore(input: DealScoreInput): number {
  const { stockStatus } = input;
  
  if (!stockStatus || stockStatus === 'unknown') return 5;
  if (stockStatus === 'in_stock') return 10;
  if (stockStatus === 'low_stock') return 7;
  if (stockStatus === 'out_of_stock') return 0;
  
  return 5;
}

/**
 * Calculate score for promotions (0-10 points)
 */
function calculatePromotionsScore(input: DealScoreInput): number {
  let score = 0;
  
  if (input.hasVoucher) score += 5;
  if (input.hasFreeShipping) score += 5;
  
  return score;
}

/**
 * Identify potential risks
 */
function identifyRisks(input: DealScoreInput, breakdown: DealScoreOutput['breakdown']): string[] {
  const risks: string[] = [];
  
  // Check for suspicious pricing
  if (input.originalPrice && input.currentPrice) {
    const discount = ((input.originalPrice - input.currentPrice) / input.originalPrice) * 100;
    if (discount > 50) {
      risks.push('Diskon sangat besar (>50%) - periksa keaslian produk');
    }
  }
  
  // Low seller trust
  if (breakdown.sellerTrust < 5) {
    risks.push('Penjual belum terpercaya - review dan rating rendah');
  }
  
  // Out of stock
  if (input.stockStatus === 'out_of_stock') {
    risks.push('Stok habis - harga mungkin tidak valid');
  }
  
  // Price above median without justification
  if (input.median90Day && input.currentPrice > input.median90Day) {
    if (!input.isOfficialStore && breakdown.sellerTrust < 10) {
      risks.push('Harga di atas rata-rata dari penjual non-resmi');
    }
  }
  
  return risks;
}

/**
 * Assess confidence in the score
 */
function assessConfidence(input: DealScoreInput): 'high' | 'medium' | 'low' {
  let dataPoints = 0;
  
  if (input.median90Day) dataPoints++;
  if (input.median30Day) dataPoints++;
  if (input.lowestHistoricalPrice) dataPoints++;
  if (input.sellerRating && input.sellerReviewCount) dataPoints++;
  if (input.stockStatus && input.stockStatus !== 'unknown') dataPoints++;
  
  if (dataPoints >= 4) return 'high';
  if (dataPoints >= 2) return 'medium';
  return 'low';
}

/**
 * Determine label based on score and risks
 */
function determineLabel(
  score: number,
  risks: string[],
  confidence: 'high' | 'medium' | 'low'
): DealScoreLabel {
  // Low confidence
  if (confidence === 'low') {
    return 'Data belum cukup';
  }
  
  // High risk
  if (risks.length >= 2) {
    if (score >= 60) return 'Diskon mencurigakan';
    return 'Murah tapi berisiko';
  }
  
  // Score-based labels
  if (score >= 80) return 'Beli sekarang';
  if (score >= 60) return 'Harga bagus';
  if (score >= 40) return 'Tunggu turun';
  
  return 'Tunggu turun';
}

/**
 * Determine color for label
 */
function determineLabelColor(label: DealScoreLabel): 'green' | 'yellow' | 'orange' | 'red' | 'gray' {
  switch (label) {
    case 'Beli sekarang':
      return 'green';
    case 'Harga bagus':
      return 'yellow';
    case 'Tunggu turun':
      return 'orange';
    case 'Diskon mencurigakan':
    case 'Murah tapi berisiko':
      return 'red';
    case 'Data belum cukup':
      return 'gray';
  }
}

/**
 * Generate human-readable explanation
 */
function generateExplanation(
  input: DealScoreInput,
  breakdown: DealScoreOutput['breakdown'],
  risks: string[]
): string[] {
  const explanations: string[] = [];
  
  // Price discount explanation
  if (breakdown.priceDiscount >= 25 && input.median90Day) {
    const discount = ((input.median90Day - input.currentPrice) / input.median90Day) * 100;
    explanations.push(`Harga ${discount.toFixed(0)}% di bawah median 90 hari`);
  } else if (input.median90Day && input.currentPrice > input.median90Day) {
    const increase = ((input.currentPrice - input.median90Day) / input.median90Day) * 100;
    explanations.push(`Harga ${increase.toFixed(0)}% di atas median 90 hari`);
  }
  
  // Seller trust
  if (input.isOfficialStore) {
    explanations.push('Penjual resmi/official store');
  } else if (breakdown.sellerTrust >= 10) {
    explanations.push('Penjual terpercaya dengan rating tinggi');
  }
  
  // Stock status
  if (input.stockStatus === 'in_stock') {
    explanations.push('Stok tersedia');
  } else if (input.stockStatus === 'low_stock') {
    explanations.push('Stok terbatas');
  }
  
  // Promotions
  if (input.hasVoucher && input.hasFreeShipping) {
    explanations.push('Ada voucher dan gratis ongkir');
  } else if (input.hasVoucher) {
    explanations.push('Ada voucher diskon');
  } else if (input.hasFreeShipping) {
    explanations.push('Gratis ongkir');
  }
  
  return explanations;
}

/**
 * Helper: Format price as Rupiah
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
