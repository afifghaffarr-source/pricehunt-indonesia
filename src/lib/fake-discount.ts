/**
 * Fake Discount Detector
 * 
 * Analyzes pricing patterns to detect potentially fake or misleading discounts
 * common in Indonesian e-commerce platforms.
 * 
 * Detection Methods:
 * - Original price vs historical median comparison
 * - Sudden original price increases before discount
 * - Discount percentage vs historical baseline
 * - Original price inflation detection
 */

export interface FakeDiscountInput {
  // Current pricing
  currentPrice: number;
  originalPrice: number;
  
  // Historical data
  lowestHistoricalPrice?: number;
  median30Day?: number;
  median90Day?: number;
  historicalPrices?: Array<{
    price: number;
    date: string;
  }>;
  
  // Context
  productAge?: number; // days since first tracked
}

export interface FakeDiscountOutput {
  // Overall assessment
  status: 'legitimate' | 'normal' | 'suspicious' | 'likely_fake' | 'insufficient_data';
  confidence: number; // 0-100
  
  // Detailed analysis
  analysis: {
    discountPercent: number;
    originalPriceInflation: number; // How much original is inflated vs median
    currentPriceVsMedian: number; // Current vs historical median
    priceStability: 'stable' | 'volatile' | 'unknown';
  };
  
  // Flags
  flags: DiscountFlag[];
  
  // User-friendly explanation
  explanation: string;
  shortExplanation: string;
}

export type DiscountFlag = 
  | 'original_price_inflated'
  | 'discount_too_high'
  | 'price_above_historical_max'
  | 'recent_price_spike'
  | 'current_price_normal'
  | 'insufficient_history';

/**
 * Detect fake or suspicious discounts
 */
export function detectFakeDiscount(input: FakeDiscountInput): FakeDiscountOutput {
  const { currentPrice, originalPrice, median30Day, median90Day, lowestHistoricalPrice } = input;
  
  // Calculate discount percentage
  const discountPercent = ((originalPrice - currentPrice) / originalPrice) * 100;
  
  // Check if we have enough data
  const hasEnoughData = !!(median30Day || median90Day);
  
  if (!hasEnoughData) {
    return {
      status: 'insufficient_data',
      confidence: 0,
      analysis: {
        discountPercent,
        originalPriceInflation: 0,
        currentPriceVsMedian: 0,
        priceStability: 'unknown',
      },
      flags: ['insufficient_history'],
      explanation: 'Belum ada cukup data riwayat harga untuk mendeteksi keaslian diskon. PriceHunt akan terus memantau produk ini.',
      shortExplanation: 'Data belum cukup',
    };
  }
  
  // Use 90-day median as primary baseline, fall back to 30-day
  const medianPrice = median90Day || median30Day || currentPrice;
  
  // Calculate original price inflation
  const originalPriceInflation = ((originalPrice - medianPrice) / medianPrice) * 100;
  
  // Calculate current price vs median
  const currentPriceVsMedian = ((currentPrice - medianPrice) / medianPrice) * 100;
  
  // Assess price stability
  const priceStability = assessPriceStability(input);
  
  // Collect flags
  const flags = collectFlags({
    discountPercent,
    originalPriceInflation,
    currentPriceVsMedian,
    lowestHistoricalPrice,
    currentPrice,
    originalPrice,
    medianPrice,
  });
  
  // Determine status and confidence
  const { status, confidence } = determineStatus(flags, originalPriceInflation, discountPercent);
  
  // Generate explanations
  const { explanation, shortExplanation } = generateExplanation(
    status,
    flags,
    {
      discountPercent,
      originalPriceInflation,
      currentPriceVsMedian,
      medianPrice,
      currentPrice,
    }
  );
  
  return {
    status,
    confidence,
    analysis: {
      discountPercent,
      originalPriceInflation,
      currentPriceVsMedian,
      priceStability,
    },
    flags,
    explanation,
    shortExplanation,
  };
}

/**
 * Assess price stability over time
 */
function assessPriceStability(input: FakeDiscountInput): 'stable' | 'volatile' | 'unknown' {
  const { median30Day, median90Day, lowestHistoricalPrice } = input;
  
  if (!median30Day || !median90Day || !lowestHistoricalPrice) {
    return 'unknown';
  }
  
  // Calculate price range
  const range = median90Day - lowestHistoricalPrice;
  const rangePercent = (range / median90Day) * 100;
  
  // Stable: price variation < 15%
  // Volatile: price variation >= 15%
  if (rangePercent < 15) return 'stable';
  return 'volatile';
}

/**
 * Collect discount flags based on analysis
 */
function collectFlags(params: {
  discountPercent: number;
  originalPriceInflation: number;
  currentPriceVsMedian: number;
  lowestHistoricalPrice?: number;
  currentPrice: number;
  originalPrice: number;
  medianPrice: number;
}): DiscountFlag[] {
  const flags: DiscountFlag[] = [];
  const {
    discountPercent,
    originalPriceInflation,
    currentPriceVsMedian,
    lowestHistoricalPrice,
    medianPrice,
  } = params;
  
  // Flag 1: Original price significantly inflated (>20% above median)
  if (originalPriceInflation > 20) {
    flags.push('original_price_inflated');
  }
  
  // Flag 2: Discount percentage is suspiciously high (>60%)
  if (discountPercent > 60) {
    flags.push('discount_too_high');
  }
  
  // Flag 3: Original price is way above any historical price
  if (lowestHistoricalPrice && params.originalPrice > medianPrice * 1.5) {
    flags.push('price_above_historical_max');
  }
  
  // Flag 4: Current price is actually at or below historical median (good sign)
  if (currentPriceVsMedian <= 0) {
    flags.push('current_price_normal');
  }
  
  return flags;
}

/**
 * Determine overall status and confidence
 */
function determineStatus(
  flags: DiscountFlag[],
  _originalPriceInflation: number,
  _discountPercent: number
): { status: FakeDiscountOutput['status']; confidence: number } {
  // Calculate suspicion score (0-100, higher = more suspicious)
  let suspicionScore = 0;
  
  if (flags.includes('original_price_inflated')) suspicionScore += 40;
  if (flags.includes('discount_too_high')) suspicionScore += 30;
  if (flags.includes('price_above_historical_max')) suspicionScore += 20;
  if (flags.includes('current_price_normal')) suspicionScore -= 30; // Good sign
  
  // Ensure score stays in 0-100 range
  suspicionScore = Math.max(0, Math.min(100, suspicionScore));
  
  // Determine status based on suspicion score
  let status: FakeDiscountOutput['status'];
  let confidence: number;
  
  if (suspicionScore >= 70) {
    status = 'likely_fake';
    confidence = suspicionScore;
  } else if (suspicionScore >= 40) {
    status = 'suspicious';
    confidence = suspicionScore;
  } else if (suspicionScore >= 20) {
    status = 'normal';
    confidence = 100 - suspicionScore;
  } else {
    status = 'legitimate';
    confidence = 100 - suspicionScore;
  }
  
  return { status, confidence };
}

/**
 * Generate human-readable explanations
 */
function generateExplanation(
  status: FakeDiscountOutput['status'],
  flags: DiscountFlag[],
  data: {
    discountPercent: number;
    originalPriceInflation: number;
    currentPriceVsMedian: number;
    medianPrice: number;
    currentPrice: number;
  }
): { explanation: string; shortExplanation: string } {
  const { discountPercent, originalPriceInflation, currentPriceVsMedian, medianPrice, currentPrice } = data;
  
  let explanation: string;
  let shortExplanation: string;
  
  switch (status) {
    case 'legitimate':
      shortExplanation = 'Diskon terlihat asli';
      explanation = `Diskon ${discountPercent.toFixed(0)}% ini terlihat asli. `;
      
      if (flags.includes('current_price_normal')) {
        explanation += `Harga sekarang (${formatRupiah(currentPrice)}) sesuai dengan median historis (${formatRupiah(medianPrice)}). `;
      }
      
      if (originalPriceInflation < 10) {
        explanation += 'Harga asli tidak terindikasi dinaikkan secara artifisial.';
      } else {
        explanation += 'Berdasarkan riwayat harga yang tersedia, diskon ini wajar.';
      }
      break;
      
    case 'normal':
      shortExplanation = 'Diskon normal';
      explanation = `Diskon ${discountPercent.toFixed(0)}% terlihat wajar. `;
      
      if (currentPriceVsMedian <= 5 && currentPriceVsMedian >= -5) {
        explanation += `Harga setelah diskon mendekati harga normal produk ini. `;
      }
      
      explanation += 'Tidak ada tanda-tanda diskon palsu yang jelas.';
      break;
      
    case 'suspicious':
      shortExplanation = 'Diskon mencurigakan';
      explanation = `Diskon ${discountPercent.toFixed(0)}% ini mencurigakan. `;
      
      if (flags.includes('original_price_inflated')) {
        explanation += `Harga asli terindikasi dinaikkan ${originalPriceInflation.toFixed(0)}% dari median historis. `;
      }
      
      if (flags.includes('discount_too_high')) {
        explanation += 'Diskon lebih dari 60% jarang terjadi pada produk asli. ';
      }
      
      explanation += 'Sebaiknya periksa kembali keaslian produk dan reputasi penjual.';
      break;
      
    case 'likely_fake':
      shortExplanation = 'Kemungkinan diskon palsu';
      explanation = `Diskon ${discountPercent.toFixed(0)}% ini kemungkinan besar palsu. `;
      
      if (flags.includes('original_price_inflated')) {
        explanation += `Harga asli dinaikkan ${originalPriceInflation.toFixed(0)}% dari harga normal, lalu didiskon untuk menciptakan ilusi penghematan besar. `;
      }
      
      if (flags.includes('price_above_historical_max')) {
        explanation += 'Harga asli jauh melebihi harga tertinggi yang pernah tercatat. ';
      }
      
      explanation += `Harga sebenarnya produk ini sekitar ${formatRupiah(medianPrice)} berdasarkan riwayat. `;
      explanation += 'Hati-hati dengan penjual ini.';
      break;
      
    case 'insufficient_data':
      shortExplanation = 'Data belum cukup';
      explanation = 'Belum ada cukup data riwayat harga untuk mendeteksi keaslian diskon.';
      break;
  }
  
  return { explanation, shortExplanation };
}

/**
 * Helper: Format price as Rupiah
 */
function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get discount legitimacy badge info
 */
export function getDiscountBadge(status: FakeDiscountOutput['status']): {
  icon: string;
  color: 'green' | 'yellow' | 'red' | 'gray';
  text: string;
} {
  switch (status) {
    case 'legitimate':
      return {
        icon: '✓',
        color: 'green',
        text: 'Diskon Asli',
      };
    case 'normal':
      return {
        icon: '○',
        color: 'yellow',
        text: 'Diskon Wajar',
      };
    case 'suspicious':
      return {
        icon: '⚠',
        color: 'red',
        text: 'Mencurigakan',
      };
    case 'likely_fake':
      return {
        icon: '✗',
        color: 'red',
        text: 'Kemungkinan Palsu',
      };
    case 'insufficient_data':
      return {
        icon: '?',
        color: 'gray',
        text: 'Data Belum Cukup',
      };
  }
}
