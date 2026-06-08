"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calculator,
  TrendingDown,
  Package,
  Truck,
  Tag,
  Coins,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MarketplacePrice {
  marketplace: string;
  price: number;
  url: string;
}

interface TotalCostCalculatorProps {
  prices: MarketplacePrice[];
  className?: string;
}

interface CostBreakdown {
  basePrice: number;
  shipping: number;
  serviceFee: number;
  voucherDiscount: number;
  cashback: number;
  total: number;
}

export function TotalCostCalculator({
  prices,
  className,
}: TotalCostCalculatorProps) {
  const [shipping, setShipping] = useState<number>(0);
  const [serviceFee, setServiceFee] = useState<number>(0);
  const [voucher, setVoucher] = useState<number>(0);
  const [cashback, setCashback] = useState<number>(0);
  const [showResults, setShowResults] = useState(false);

  const calculateTotalCost = (basePrice: number): CostBreakdown => {
    const total = basePrice + shipping + serviceFee - voucher - cashback;
    return {
      basePrice,
      shipping,
      serviceFee,
      voucherDiscount: voucher,
      cashback,
      total: Math.max(0, total),
    };
  };

  const calculateAllCosts = () => {
    return prices.map(p => ({
      marketplace: p.marketplace,
      url: p.url,
      breakdown: calculateTotalCost(p.price),
    })).sort((a, b) => a.breakdown.total - b.breakdown.total);
  };

  const handleCalculate = () => {
    setShowResults(true);
  };

  const handleReset = () => {
    setShipping(0);
    setServiceFee(0);
    setVoucher(0);
    setCashback(0);
    setShowResults(false);
  };

  const results = showResults ? calculateAllCosts() : [];
  const cheapestByPrice = [...prices].sort((a, b) => a.price - b.price)[0];
  const cheapestByTotal = results[0];

  return (
    <Card className={cn("border-2", className)}>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <Calculator className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-xl">Hitung Total Bayar Real</CardTitle>
            <CardDescription className="mt-1">
              Jangan cuma lihat harga barang. Hitung total yang benar-benar kamu bayar termasuk ongkir, voucher, dan cashback.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Input Form */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Truck className="h-4 w-4 text-muted-foreground" />
              Ongkir (Rp)
            </label>
            <Input
              type="number"
              placeholder="0"
              value={shipping || ""}
              onChange={(e) => setShipping(Number(e.target.value) || 0)}
              min="0"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Biaya Layanan (Rp)
            </label>
            <Input
              type="number"
              placeholder="0"
              value={serviceFee || ""}
              onChange={(e) => setServiceFee(Number(e.target.value) || 0)}
              min="0"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Tag className="h-4 w-4 text-muted-foreground" />
              Potongan Voucher (Rp)
            </label>
            <Input
              type="number"
              placeholder="0"
              value={voucher || ""}
              onChange={(e) => setVoucher(Number(e.target.value) || 0)}
              min="0"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Coins className="h-4 w-4 text-muted-foreground" />
              Cashback (Rp)
            </label>
            <Input
              type="number"
              placeholder="0"
              value={cashback || ""}
              onChange={(e) => setCashback(Number(e.target.value) || 0)}
              min="0"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={handleCalculate} className="flex-1">
            <Calculator className="mr-2 h-4 w-4" />
            Hitung Total
          </Button>
          {showResults && (
            <Button onClick={handleReset} variant="outline">
              Reset
            </Button>
          )}
        </div>

        {/* Results */}
        {showResults && results.length > 0 && (
          <div className="space-y-4 pt-4 border-t">
            {/* Comparison Summary */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">Termurah Harga Barang</p>
                <p className="text-sm font-medium">{cheapestByPrice.marketplace}</p>
                <p className="text-lg font-bold text-primary">
                  Rp {cheapestByPrice.price.toLocaleString("id-ID")}
                </p>
              </div>

              <div className="rounded-lg border bg-primary/5 p-3">
                <p className="text-xs text-muted-foreground mb-1">Termurah Total Bayar</p>
                <p className="text-sm font-medium">{cheapestByTotal.marketplace}</p>
                <p className="text-lg font-bold text-primary">
                  Rp {cheapestByTotal.breakdown.total.toLocaleString("id-ID")}
                </p>
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Rincian Semua Marketplace:</p>
              {results.map((result, index) => (
                <div
                  key={result.marketplace}
                  className={cn(
                    "rounded-lg border p-4 space-y-3",
                    index === 0 && "border-primary bg-primary/5"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{result.marketplace}</span>
                      {index === 0 && (
                        <Badge variant="default" className="text-xs">
                          <TrendingDown className="mr-1 h-3 w-3" />
                          Termurah
                        </Badge>
                      )}
                    </div>
                    <span className="text-lg font-bold">
                      Rp {result.breakdown.total.toLocaleString("id-ID")}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Harga Barang:</span>
                      <span>Rp {result.breakdown.basePrice.toLocaleString("id-ID")}</span>
                    </div>
                    {result.breakdown.shipping > 0 && (
                      <div className="flex justify-between">
                        <span>+ Ongkir:</span>
                        <span>Rp {result.breakdown.shipping.toLocaleString("id-ID")}</span>
                      </div>
                    )}
                    {result.breakdown.serviceFee > 0 && (
                      <div className="flex justify-between">
                        <span>+ Biaya Layanan:</span>
                        <span>Rp {result.breakdown.serviceFee.toLocaleString("id-ID")}</span>
                      </div>
                    )}
                    {result.breakdown.voucherDiscount > 0 && (
                      <div className="flex justify-between text-green-600 dark:text-green-400">
                        <span>- Voucher:</span>
                        <span>Rp {result.breakdown.voucherDiscount.toLocaleString("id-ID")}</span>
                      </div>
                    )}
                    {result.breakdown.cashback > 0 && (
                      <div className="flex justify-between text-green-600 dark:text-green-400">
                        <span>- Cashback:</span>
                        <span>Rp {result.breakdown.cashback.toLocaleString("id-ID")}</span>
                      </div>
                    )}
                  </div>

                  {index === 0 && results.length > 1 && (
                    <div className="pt-2 border-t text-xs">
                      <p className="text-green-600 dark:text-green-400 font-medium">
                        💰 Hemat Rp {(results[1].breakdown.total - result.breakdown.total).toLocaleString("id-ID")} dibanding pilihan kedua
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Insight */}
            {cheapestByPrice.marketplace !== cheapestByTotal.marketplace && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <p className="text-sm">
                  <span className="font-medium">💡 Insight:</span> Termurah harga barang ({cheapestByPrice.marketplace}) 
                  ternyata bukan yang termurah total bayar. Setelah dihitung semua biaya, 
                  <span className="font-semibold"> {cheapestByTotal.marketplace} </span> 
                  lebih hemat Rp {(calculateTotalCost(cheapestByPrice.price).total - cheapestByTotal.breakdown.total).toLocaleString("id-ID")}.
                </p>
              </div>
            )}

            {/* Disclaimer */}
            <p className="text-xs text-muted-foreground">
              * Perhitungan ini adalah estimasi berdasarkan input Anda. Biaya aktual bisa berbeda tergantung promo, lokasi, dan metode pembayaran.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
