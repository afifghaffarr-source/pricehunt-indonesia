/**
 * Total Cost Calculator
 * 
 * Calculates the real total cost of purchasing a product, including:
 * - Product price
 * - Shipping costs
 * - Service fees
 * - Vouchers/discounts
 * - Cashback
 * 
 * Helps users compare true costs across marketplaces.
 */

export interface TotalCostInput {
  // Base price
  productPrice: number;
  
  // Shipping
  shippingCost?: number;
  shippingEstimate?: {
    min: number;
    max: number;
  };
  hasFreeShipping?: boolean;
  
  // Fees
  serviceFee?: number;
  serviceFeePercent?: number; // e.g., 1.5 for 1.5%
  insuranceFee?: number;
  
  // Discounts & vouchers
  productDiscount?: number; // Already applied to productPrice
  voucherDiscount?: number;
  voucherPercent?: number;
  voucherMaxDiscount?: number;
  
  // Cashback
  cashback?: number;
  cashbackPercent?: number;
  cashbackMaxAmount?: number;
  
  // Context
  marketplace?: string;
}

export interface TotalCostOutput {
  // Breakdown
  breakdown: {
    productPrice: number;
    shipping: number;
    serviceFee: number;
    insuranceFee: number;
    subtotal: number;
    voucherDiscount: number;
    totalBeforeCashback: number;
    cashback: number;
    finalTotal: number;
  };
  
  // Summary
  summary: {
    youPay: number; // Total to pay at checkout
    youGet: number; // Estimated return (cashback)
    netCost: number; // youPay - youGet
  };
  
  // Estimated range (if shipping has min/max)
  estimatedRange?: {
    min: number;
    max: number;
  };
  
  // Savings
  savings: {
    total: number;
    items: Array<{
      type: 'voucher' | 'cashback' | 'free_shipping';
      amount: number;
      label: string;
    }>;
  };
}

/**
 * Calculate total real cost
 */
export function calculateTotalCost(input: TotalCostInput): TotalCostOutput {
  const {
    productPrice,
    shippingCost = 0,
    hasFreeShipping = false,
    serviceFee = 0,
    serviceFeePercent = 0,
    insuranceFee = 0,
    voucherDiscount = 0,
    voucherPercent = 0,
    voucherMaxDiscount,
    cashback = 0,
    cashbackPercent = 0,
    cashbackMaxAmount,
  } = input;
  
  // Calculate shipping
  const finalShippingCost = hasFreeShipping ? 0 : shippingCost;
  
  // Calculate service fee
  let finalServiceFee = serviceFee;
  if (serviceFeePercent > 0) {
    finalServiceFee += (productPrice * serviceFeePercent) / 100;
  }
  
  // Calculate subtotal before voucher
  const subtotal = productPrice + finalShippingCost + finalServiceFee + insuranceFee;
  
  // Calculate voucher discount
  let finalVoucherDiscount = voucherDiscount;
  if (voucherPercent > 0) {
    const percentDiscount = (subtotal * voucherPercent) / 100;
    finalVoucherDiscount = voucherMaxDiscount
      ? Math.min(percentDiscount, voucherMaxDiscount)
      : percentDiscount;
  }
  
  // Calculate total before cashback
  const totalBeforeCashback = Math.max(0, subtotal - finalVoucherDiscount);
  
  // Calculate cashback
  let finalCashback = cashback;
  if (cashbackPercent > 0) {
    const percentCashback = (productPrice * cashbackPercent) / 100;
    finalCashback = cashbackMaxAmount
      ? Math.min(percentCashback, cashbackMaxAmount)
      : percentCashback;
  }
  
  // Calculate final total
  const finalTotal = totalBeforeCashback - finalCashback;
  
  // Calculate savings
  const savings = calculateSavings(input, {
    voucherDiscount: finalVoucherDiscount,
    cashback: finalCashback,
    shippingCost: hasFreeShipping ? shippingCost : 0,
  });
  
  // Calculate estimated range if shipping has min/max
  let estimatedRange: TotalCostOutput['estimatedRange'];
  if (input.shippingEstimate && !hasFreeShipping) {
    const { min, max } = input.shippingEstimate;
    const baseTotal = productPrice + finalServiceFee + insuranceFee - finalVoucherDiscount;
    estimatedRange = {
      min: Math.max(0, baseTotal + min - finalCashback),
      max: Math.max(0, baseTotal + max - finalCashback),
    };
  }
  
  return {
    breakdown: {
      productPrice,
      shipping: finalShippingCost,
      serviceFee: finalServiceFee,
      insuranceFee,
      subtotal,
      voucherDiscount: finalVoucherDiscount,
      totalBeforeCashback,
      cashback: finalCashback,
      finalTotal,
    },
    summary: {
      youPay: totalBeforeCashback,
      youGet: finalCashback,
      netCost: finalTotal,
    },
    estimatedRange,
    savings,
  };
}

/**
 * Calculate total savings
 */
function calculateSavings(
  input: TotalCostInput,
  calculated: {
    voucherDiscount: number;
    cashback: number;
    shippingCost: number;
  }
): TotalCostOutput['savings'] {
  const items: TotalCostOutput['savings']['items'] = [];
  let total = 0;
  
  // Voucher savings
  if (calculated.voucherDiscount > 0) {
    items.push({
      type: 'voucher',
      amount: calculated.voucherDiscount,
      label: `Voucher ${input.marketplace || 'toko'}`,
    });
    total += calculated.voucherDiscount;
  }
  
  // Cashback savings
  if (calculated.cashback > 0) {
    items.push({
      type: 'cashback',
      amount: calculated.cashback,
      label: 'Cashback',
    });
    total += calculated.cashback;
  }
  
  // Free shipping savings
  if (input.hasFreeShipping && calculated.shippingCost > 0) {
    items.push({
      type: 'free_shipping',
      amount: calculated.shippingCost,
      label: 'Gratis ongkir',
    });
    total += calculated.shippingCost;
  }
  
  return { total, items };
}

/**
 * Compare costs across multiple offers
 */
export interface CostComparison {
  offers: Array<{
    marketplace: string;
    productPrice: number;
    totalCost: TotalCostOutput;
    isCheapestPrice: boolean;
    isCheapestTotal: boolean;
  }>;
  
  cheapest: {
    byPrice: {
      marketplace: string;
      price: number;
    };
    byTotal: {
      marketplace: string;
      total: number;
    };
  };
  
  savings: {
    priceVsTotal: number; // How much you save by choosing cheapest total vs cheapest price
  };
}

/**
 * Compare total costs across multiple marketplace offers
 */
export function compareTotalCosts(
  offers: Array<{
    marketplace: string;
    input: TotalCostInput;
  }>
): CostComparison {
  if (offers.length === 0) {
    throw new Error('At least one offer is required');
  }
  
  // Calculate total cost for each offer
  const calculated = offers.map(({ marketplace, input }) => ({
    marketplace,
    productPrice: input.productPrice,
    totalCost: calculateTotalCost(input),
  }));
  
  // Find cheapest by product price
  const cheapestByPrice = calculated.reduce((min, offer) =>
    offer.productPrice < min.productPrice ? offer : min
  );
  
  // Find cheapest by total cost
  const cheapestByTotal = calculated.reduce((min, offer) =>
    offer.totalCost.summary.netCost < min.totalCost.summary.netCost ? offer : min
  );
  
  // Mark which offers are cheapest
  const offersWithFlags = calculated.map((offer) => ({
    ...offer,
    isCheapestPrice: offer.marketplace === cheapestByPrice.marketplace,
    isCheapestTotal: offer.marketplace === cheapestByTotal.marketplace,
  }));
  
  // Calculate savings from choosing cheapest total over cheapest price
  const priceVsTotalSavings =
    cheapestByPrice.totalCost.summary.netCost - cheapestByTotal.totalCost.summary.netCost;
  
  return {
    offers: offersWithFlags,
    cheapest: {
      byPrice: {
        marketplace: cheapestByPrice.marketplace,
        price: cheapestByPrice.productPrice,
      },
      byTotal: {
        marketplace: cheapestByTotal.marketplace,
        total: cheapestByTotal.totalCost.summary.netCost,
      },
    },
    savings: {
      priceVsTotal: Math.max(0, priceVsTotalSavings),
    },
  };
}

/**
 * Generate cost comparison summary for users
 */
export function generateComparisonSummary(comparison: CostComparison): {
  title: string;
  description: string;
  recommendation: string;
} {
  const { cheapest, savings } = comparison;
  const isSameMarketplace = cheapest.byPrice.marketplace === cheapest.byTotal.marketplace;
  
  let title: string;
  let description: string;
  let recommendation: string;
  
  if (isSameMarketplace) {
    title = 'Harga termurah juga total termurah';
    description = `${cheapest.byTotal.marketplace} memiliki harga produk termurah DAN total bayar termurah.`;
    recommendation = `Beli di ${cheapest.byTotal.marketplace} untuk hemat maksimal.`;
  } else {
    title = 'Harga termurah ≠ Total termurah';
    description = `${cheapest.byPrice.marketplace} punya harga produk termurah (${formatRupiah(cheapest.byPrice.price)}), `;
    description += `tapi ${cheapest.byTotal.marketplace} lebih murah total bayarnya (${formatRupiah(cheapest.byTotal.total)}).`;
    
    if (savings.priceVsTotal > 0) {
      recommendation = `Hemat ${formatRupiah(savings.priceVsTotal)} dengan beli di ${cheapest.byTotal.marketplace} walaupun harga produknya lebih mahal.`;
    } else {
      recommendation = `Pilih ${cheapest.byTotal.marketplace} untuk total bayar termurah.`;
    }
  }
  
  return { title, description, recommendation };
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

/**
 * Helper: Get shipping cost estimate label
 */
export function getShippingLabel(input: TotalCostInput): string {
  if (input.hasFreeShipping) return 'Gratis ongkir';
  if (input.shippingEstimate) {
    const { min, max } = input.shippingEstimate;
    return `${formatRupiah(min)} - ${formatRupiah(max)}`;
  }
  if (input.shippingCost !== undefined && input.shippingCost > 0) {
    return formatRupiah(input.shippingCost);
  }
  return 'Belum dihitung';
}
