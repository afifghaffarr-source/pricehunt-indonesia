"use client";

import { useState, useCallback } from "react";
import { CURRENCIES, convertCurrency, formatCurrency } from "@/lib/currency";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CurrencySelectorProps {
  amountIDR: number;
  className?: string;
}

export function CurrencySelector({ amountIDR, className }: CurrencySelectorProps) {
  const [currency, setCurrency] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("preferred_currency");
      if (saved && CURRENCIES.find((c) => c.code === saved)) return saved;
    }
    return "IDR";
  });

  const handleCurrencyChange = useCallback((val: string | null) => {
    const code = val || "IDR";
    setCurrency(code);
    if (typeof window !== "undefined") {
      localStorage.setItem("preferred_currency", code);
    }
  }, []);

  const converted = convertCurrency(amountIDR, currency);

  return (
    <div className={className} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <span className="text-lg font-bold text-primary">
        {formatCurrency(converted, currency)}
      </span>
      <Select value={currency} onValueChange={handleCurrencyChange}>
        <SelectTrigger className="h-7 w-20 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CURRENCIES.map((c) => (
            <SelectItem key={c.code} value={c.code} className="text-xs">
              {c.code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
