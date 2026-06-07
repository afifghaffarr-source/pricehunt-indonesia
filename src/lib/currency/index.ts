export interface CurrencyRate {
  code: string;
  name: string;
  symbol: string;
  rateFromIDR: number;
}

export const CURRENCIES: CurrencyRate[] = [
  { code: "IDR", name: "Rupiah Indonesia", symbol: "Rp", rateFromIDR: 1 },
  { code: "USD", name: "US Dollar", symbol: "$", rateFromIDR: 0.000062 },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", rateFromIDR: 0.000083 },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", rateFromIDR: 0.00029 },
  { code: "EUR", name: "Euro", symbol: "€", rateFromIDR: 0.000057 },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", rateFromIDR: 0.0093 },
];

export function convertCurrency(
  amountIDR: number,
  toCurrency: string
): number {
  const currency = CURRENCIES.find((c) => c.code === toCurrency);
  if (!currency) return amountIDR;
  return Math.round(amountIDR * currency.rateFromIDR * 100) / 100;
}

export function formatCurrency(amount: number, currencyCode: string): string {
  const currency = CURRENCIES.find((c) => c.code === currencyCode);
  if (!currency) return `Rp${amount.toLocaleString("id-ID")}`;

  if (currencyCode === "IDR") {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  return `${currency.symbol}${amount.toLocaleString("en-US", {
    minimumFractionDigits: currencyCode === "JPY" ? 0 : 2,
    maximumFractionDigits: currencyCode === "JPY" ? 0 : 2,
  })}`;
}

export function getCurrencyByCode(code: string): CurrencyRate | undefined {
  return CURRENCIES.find((c) => c.code === code);
}
