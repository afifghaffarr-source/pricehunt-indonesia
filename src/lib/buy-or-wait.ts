/**
 * Buy Now or Wait Recommendation Engine
 * 
 * Combines multiple data sources to provide actionable buying recommendations:
 * - Deal score analysis
 * - Fake discount detection
 * - Price history trends
 * - Stock availability
 * - Upcoming campaigns/sales
 * 
 * Helps users make confident buying decisions.
 */

import { calculateDealScore, type DealScoreInput, type DealScoreOutput } from './deal-score';
import { detectFakeDiscount, type FakeDiscountInput, type FakeDiscountOutput } from './fake-discount';

export interface BuyOrWaitInput {
  // Price data
  currentPrice: number;
  originalPrice?: number;
  lowestHistoricalPrice?: number;
  median30Day?: number;
  median90Day?: number;
  
  // Seller data
  sellerRating?: number;
  sellerReviewCount?: number;
  isOfficialStore?: boolean;
  
  // Stock & availability
  stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'unknown';
  
  // Promotions
  hasVoucher?: boolean;
  hasFreeShipping?: boolean;
  
  // Context
  daysUntilNextCampaign?: number; // Days until next major sale (e.g., 7.7, 8.8, 11.11, 12.12)
  campaignName?: string;
  priceVolatility?: 'stable' | 'volatile';
}

export interface BuyOrWaitOutput {
  // Main recommendation
  recommendation: 'buy_now' | 'watch' | 'wait' | 'avoid';
  confidence: 'high' | 'medium' | 'low';
  
  // Decision factors
  dealScore: DealScoreOutput;
  fakeDiscountAnalysis?: FakeDiscountOutput;
  
  // Key reasons (max 3-4 bullet points)
  reasons: string[];
  
  // Target price suggestion
  targetPrice?: {
    amount: number;
    reasoning: string;
  };
  
  // Timeline suggestion
  timeline?: {
    suggestion: string;
    deadline?: string;
  };
  
  // User-friendly summary
  summary: {
    title: string;
    description: string;
    action: string;
  };
}

export type RecommendationType = BuyOrWaitOutput['recommendation'];

/**
 * Generate buy now or wait recommendation
 */
export function generateBuyOrWaitRecommendation(input: BuyOrWaitInput): BuyOrWaitOutput {
  // Calculate deal score
  const dealScoreInput: DealScoreInput = {
    currentPrice: input.currentPrice,
    originalPrice: input.originalPrice,
    lowestHistoricalPrice: input.lowestHistoricalPrice,
    median30Day: input.median30Day,
    median90Day: input.median90Day,
    sellerRating: input.sellerRating,
    sellerReviewCount: input.sellerReviewCount,
    isOfficialStore: input.isOfficialStore,
    stockStatus: input.stockStatus,
    hasVoucher: input.hasVoucher,
    hasFreeShipping: input.hasFreeShipping,
  };
  
  const dealScore = calculateDealScore(dealScoreInput);
  
  // Analyze fake discount if original price provided
  let fakeDiscountAnalysis: FakeDiscountOutput | undefined;
  if (input.originalPrice) {
    const fakeDiscountInput: FakeDiscountInput = {
      currentPrice: input.currentPrice,
      originalPrice: input.originalPrice,
      lowestHistoricalPrice: input.lowestHistoricalPrice,
      median30Day: input.median30Day,
      median90Day: input.median90Day,
    };
    fakeDiscountAnalysis = detectFakeDiscount(fakeDiscountInput);
  }
  
  // Determine recommendation
  const { recommendation, confidence } = determineRecommendation(
    input,
    dealScore,
    fakeDiscountAnalysis
  );
  
  // Generate reasons
  const reasons = generateReasons(input, dealScore, fakeDiscountAnalysis, recommendation);
  
  // Calculate target price if waiting is recommended
  const targetPrice = calculateTargetPrice(input, recommendation);
  
  // Generate timeline suggestion
  const timeline = generateTimeline(input, recommendation);
  
  // Generate summary
  const summary = generateSummary(recommendation, input, dealScore);
  
  return {
    recommendation,
    confidence,
    dealScore,
    fakeDiscountAnalysis,
    reasons,
    targetPrice,
    timeline,
    summary,
  };
}

/**
 * Determine main recommendation
 */
function determineRecommendation(
  input: BuyOrWaitInput,
  dealScore: DealScoreOutput,
  fakeDiscount?: FakeDiscountOutput
): { recommendation: RecommendationType; confidence: BuyOrWaitOutput['confidence'] } {
  let recommendation: RecommendationType;
  let confidence: BuyOrWaitOutput['confidence'] = 'medium';
  
  // Check for red flags first
  const hasCriticalIssues = checkCriticalIssues(input, dealScore, fakeDiscount);
  if (hasCriticalIssues) {
    return { recommendation: 'avoid', confidence: 'high' };
  }
  
  // Check if fake discount
  if (fakeDiscount && (fakeDiscount.status === 'likely_fake' || fakeDiscount.status === 'suspicious')) {
    return { recommendation: 'avoid', confidence: 'high' };
  }
  
  // Check stock status
  if (input.stockStatus === 'out_of_stock') {
    return { recommendation: 'wait', confidence: 'high' };
  }
  
  // Calculate recommendation score
  const score = dealScore.score;
  const campaignSoon = input.daysUntilNextCampaign && input.daysUntilNextCampaign <= 14;
  const priceAboveMedian = input.median90Day && input.currentPrice > input.median90Day;
  
  // Decision logic
  if (score >= 80) {
    // Excellent deal
    if (input.stockStatus === 'low_stock') {
      recommendation = 'buy_now';
      confidence = 'high';
    } else {
      recommendation = 'buy_now';
      confidence = 'high';
    }
  } else if (score >= 60) {
    // Good deal
    if (campaignSoon) {
      recommendation = 'watch';
      confidence = 'medium';
    } else if (input.stockStatus === 'low_stock') {
      recommendation = 'buy_now';
      confidence = 'medium';
    } else {
      recommendation = 'buy_now';
      confidence = 'medium';
    }
  } else if (score >= 40) {
    // Average deal
    if (campaignSoon) {
      recommendation = 'wait';
      confidence = 'medium';
    } else if (priceAboveMedian) {
      recommendation = 'watch';
      confidence = 'medium';
    } else {
      recommendation = 'watch';
      confidence = 'low';
    }
  } else {
    // Poor deal
    if (campaignSoon) {
      recommendation = 'wait';
      confidence = 'high';
    } else {
      recommendation = 'wait';
      confidence = 'medium';
    }
  }
  
  return { recommendation, confidence };
}

/**
 * Check for critical issues that should trigger "avoid"
 */
function checkCriticalIssues(
  input: BuyOrWaitInput,
  dealScore: DealScoreOutput,
  _fakeDiscount?: FakeDiscountOutput
): boolean {
  // Very low seller trust
  if (dealScore.breakdown.sellerTrust === 0 && !input.isOfficialStore) {
    return true;
  }
  
  // Multiple high-severity risks
  const highSeverityRisks = dealScore.risks.filter(risk => 
    risk.includes('mencurigakan') || risk.includes('sangat besar')
  );
  
  if (highSeverityRisks.length >= 2) {
    return true;
  }
  
  return false;
}

/**
 * Generate reasons for recommendation
 */
function generateReasons(
  input: BuyOrWaitInput,
  dealScore: DealScoreOutput,
  fakeDiscount: FakeDiscountOutput | undefined,
  recommendation: RecommendationType
): string[] {
  const reasons: string[] = [];
  
  switch (recommendation) {
    case 'buy_now':
      // Positive reasons to buy now
      if (dealScore.breakdown.priceDiscount >= 25) {
        reasons.push(dealScore.explanation[0] || 'Harga jauh di bawah rata-rata historis');
      }
      
      if (input.isOfficialStore) {
        reasons.push('Penjual official store terpercaya');
      } else if (dealScore.breakdown.sellerTrust >= 10) {
        reasons.push('Penjual memiliki reputasi baik');
      }
      
      if (input.stockStatus === 'low_stock') {
        reasons.push('Stok terbatas - mungkin cepat habis');
      }
      
      if (dealScore.breakdown.promotions >= 5) {
        reasons.push('Ada promo gratis ongkir atau voucher');
      }
      
      if (fakeDiscount && (fakeDiscount.status === 'legitimate' || fakeDiscount.status === 'normal')) {
        reasons.push('Diskon terverifikasi asli');
      }
      break;
      
    case 'watch':
      // Reasons to watch/monitor
      if (input.daysUntilNextCampaign && input.daysUntilNextCampaign <= 14) {
        reasons.push(`Kampanye ${input.campaignName || 'besar'} dalam ${input.daysUntilNextCampaign} hari - pantau harga`);
      }
      
      if (input.median90Day && input.currentPrice > input.median90Day) {
        const diff = ((input.currentPrice - input.median90Day) / input.median90Day * 100).toFixed(0);
        reasons.push(`Harga ${diff}% di atas rata-rata - bisa turun lagi`);
      }
      
      if (dealScore.score >= 50 && dealScore.score < 70) {
        reasons.push('Harga cukup bagus tapi belum optimal');
      }
      
      reasons.push('Pantau harga beberapa hari untuk memastikan tidak turun lagi');
      break;
      
    case 'wait':
      // Reasons to wait
      if (input.daysUntilNextCampaign && input.daysUntilNextCampaign <= 21) {
        reasons.push(`Tunggu kampanye ${input.campaignName || 'besar'} - berpeluang turun`);
      }
      
      if (input.median90Day && input.currentPrice > input.median90Day * 1.1) {
        reasons.push('Harga saat ini jauh di atas rata-rata historis');
      }
      
      if (dealScore.score < 40) {
        reasons.push('Deal score rendah - belum waktu terbaik membeli');
      }
      
      if (input.stockStatus === 'out_of_stock') {
        reasons.push('Stok habis - tunggu restock dengan kemungkinan harga lebih baik');
      }
      break;
      
    case 'avoid':
      // Reasons to avoid
      if (fakeDiscount && fakeDiscount.status === 'likely_fake') {
        reasons.push('Terindikasi diskon palsu - harga asli dinaikkan artifisial');
      }
      
      if (dealScore.breakdown.sellerTrust < 5 && !input.isOfficialStore) {
        reasons.push('Penjual belum terpercaya - risiko tinggi');
      }
      
      if (dealScore.risks.length >= 2) {
        reasons.push('Terlalu banyak red flag untuk produk ini');
      }
      
      reasons.push('Sebaiknya cari penjual atau produk alternatif');
      break;
  }
  
  // Limit to 4 most important reasons
  return reasons.slice(0, 4);
}

/**
 * Calculate target price for waiting scenarios
 */
function calculateTargetPrice(
  input: BuyOrWaitInput,
  recommendation: RecommendationType
): BuyOrWaitOutput['targetPrice'] | undefined {
  if (recommendation !== 'wait' && recommendation !== 'watch') {
    return undefined;
  }
  
  const { currentPrice, median90Day, lowestHistoricalPrice } = input;
  
  // Use 90-day median as baseline target
  if (median90Day) {
    const target = Math.round(median90Day * 0.95); // 5% below median
    
    if (target < currentPrice) {
      return {
        amount: target,
        reasoning: `Target harga berdasarkan median 90 hari dengan buffer 5%`,
      };
    }
  }
  
  // Fallback: suggest 10% discount from current
  if (lowestHistoricalPrice && lowestHistoricalPrice < currentPrice) {
    return {
      amount: lowestHistoricalPrice,
      reasoning: 'Target harga terendah yang pernah tercatat',
    };
  }
  
  return {
    amount: Math.round(currentPrice * 0.9),
    reasoning: 'Target harga dengan diskon 10% dari harga saat ini',
  };
}

/**
 * Generate timeline suggestion
 */
function generateTimeline(
  input: BuyOrWaitInput,
  recommendation: RecommendationType
): BuyOrWaitOutput['timeline'] | undefined {
  if (recommendation === 'buy_now') {
    if (input.stockStatus === 'low_stock') {
      return {
        suggestion: 'Segera',
        deadline: 'Stok terbatas, bisa habis kapan saja',
      };
    }
    return {
      suggestion: 'Dalam 1-2 hari',
      deadline: 'Harga bisa berubah sewaktu-waktu',
    };
  }
  
  if (recommendation === 'watch') {
    if (input.daysUntilNextCampaign && input.daysUntilNextCampaign <= 14) {
      return {
        suggestion: `Tunggu ${input.daysUntilNextCampaign} hari`,
        deadline: `Periksa lagi saat ${input.campaignName || 'kampanye'}`,
      };
    }
    return {
      suggestion: 'Pantau 3-7 hari',
      deadline: 'Set price alert agar tidak ketinggalan turun harga',
    };
  }
  
  if (recommendation === 'wait') {
    if (input.daysUntilNextCampaign) {
      return {
        suggestion: `Tunggu hingga ${input.campaignName || 'kampanye besar'}`,
        deadline: `Sekitar ${input.daysUntilNextCampaign} hari lagi`,
      };
    }
    return {
      suggestion: 'Tunggu 1-2 minggu',
      deadline: 'Pantau penurunan harga atau kampanye baru',
    };
  }
  
  return undefined;
}

/**
 * Generate user-friendly summary
 */
function generateSummary(
  recommendation: RecommendationType,
  input: BuyOrWaitInput,
  dealScore: DealScoreOutput
): BuyOrWaitOutput['summary'] {
  const score = dealScore.score;
  
  switch (recommendation) {
    case 'buy_now':
      return {
        title: '✅ Beli Sekarang',
        description: `Deal score ${score}/100. Ini waktu yang tepat untuk membeli produk ini. Harga sedang bagus dan tidak ada red flag signifikan.`,
        action: 'Beli sekarang sebelum harga naik atau stok habis',
      };
      
    case 'watch':
      return {
        title: '👁️ Pantau Harga',
        description: `Deal score ${score}/100. Harga cukup bagus, tapi ada potensi turun lebih lagi. Pantau beberapa hari untuk memastikan.`,
        action: 'Pantau harga atau aktifkan price alert',
      };
      
    case 'wait':
      return {
        title: '⏳ Tunggu Dulu',
        description: `Deal score ${score}/100. Belum waktu terbaik untuk membeli. ${input.daysUntilNextCampaign ? `Kampanye ${input.campaignName || 'besar'} tinggal ${input.daysUntilNextCampaign} hari lagi.` : 'Harga kemungkinan bisa turun.'}`,
        action: 'Tunggu harga turun atau kampanye berikutnya',
      };
      
    case 'avoid':
      return {
        title: '⚠️ Hindari',
        description: `Deal score ${score}/100. Terlalu banyak red flag. Produk atau penjual ini tidak direkomendasikan untuk dibeli saat ini.`,
        action: 'Cari alternatif produk atau penjual lain',
      };
  }
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
