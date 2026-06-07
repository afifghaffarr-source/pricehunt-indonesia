"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Wand2, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn, formatRupiah } from "@/lib/utils";

interface SmartSearchBarProps {
  className?: string;
}

interface ParsedQuery {
  keyword: string;
  category?: string;
  maxPrice?: number;
  marketplace?: string;
}

export function SmartSearchBar({ className }: SmartSearchBarProps) {
  const [query, setQuery] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedQuery | null>(null);
  const [showParsed, setShowParsed] = useState(false);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleChange = useCallback((value: string) => {
    setQuery(value);

    if (value.length < 10) {
      setParsed(null);
      setShowParsed(false);
      return;
    }

    const looksLikeNaturalLanguage = /(dibawah|diatas|di bawah|di atas|max|min|murah|termurah|cari|carikan|rekomendasi)/i.test(value);

    if (!looksLikeNaturalLanguage) {
      setParsed(null);
      setShowParsed(false);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setParsing(true);
      try {
        const res = await fetch("/api/vexo/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intent: "smart-search", context: value }),
        });
        const data = await res.json();

        if (data.result) {
          try {
            const jsonMatch = data.result.match(/\{[\s\S]*?\}/);
            if (jsonMatch) {
              const parsedResult = JSON.parse(jsonMatch[0]);
              setParsed(parsedResult);
              setShowParsed(true);
            }
          } catch {
            // not valid JSON
          }
        }
      } catch {
        // ignore
      }
      setParsing(false);
    }, 1000);
  }, []);

  const handleSearch = () => {
    if (parsed?.keyword) {
      const params = new URLSearchParams();
      params.set("q", parsed.keyword);
      if (parsed.category) params.set("category", parsed.category);
      router.push(`/search?${params.toString()}`);
    } else {
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleClear = () => {
    setQuery("");
    setParsed(null);
    setShowParsed(false);
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        {parsing ? (
          <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-violet-500" />
        ) : (
          <Wand2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-500" />
        )}
        <Input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Cari dengan AI... misal: "cari hp samsung dibawah 5 juta"'
          className="pl-10 pr-20 border-violet-200 focus:border-violet-400"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-14 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={handleSearch}
          disabled={!query.trim()}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-3 rounded-md bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
        >
          Cari
        </button>
      </div>

      {showParsed && parsed && (
        <div className="absolute top-full z-50 mt-1 w-full rounded-lg border border-violet-200 bg-violet-50 p-3 shadow-md dark:border-violet-800 dark:bg-violet-950">
          <p className="mb-2 text-xs font-medium text-violet-600 dark:text-violet-400">
            AI memahami query Anda:
          </p>
          <div className="flex flex-wrap gap-2">
            {parsed.keyword && (
              <span className="rounded-md bg-white px-2 py-1 text-xs font-medium shadow-sm dark:bg-violet-900">
                Keyword: {parsed.keyword}
              </span>
            )}
            {parsed.category && (
              <span className="rounded-md bg-white px-2 py-1 text-xs font-medium shadow-sm dark:bg-violet-900">
                Kategori: {parsed.category}
              </span>
            )}
            {parsed.maxPrice && (
              <span className="rounded-md bg-white px-2 py-1 text-xs font-medium shadow-sm dark:bg-violet-900">
                Max: {formatRupiah(parsed.maxPrice)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
