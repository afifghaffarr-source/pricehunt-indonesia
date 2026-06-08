"use client";

import { useState } from "react";
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

  const handleChange = (value: string) => {
    setQuery(value);
    setParsed(null);
    setShowParsed(false);
  };

  const parseWithVexo = async (): Promise<ParsedQuery | null> => {
    const value = query.trim();
    if (value.length < 10) return null;

    const looksLikeNaturalLanguage = /(dibawah|diatas|di bawah|di atas|max|min|murah|termurah|cari|carikan|rekomendasi)/i.test(value);
    if (!looksLikeNaturalLanguage) return null;

    setParsing(true);
    try {
      const res = await fetch("/api/vexo/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "smart-search", context: value }),
      });
      const data = await res.json();

      if (data.result) {
        const jsonMatch = data.result.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          const parsedResult = JSON.parse(jsonMatch[0]) as ParsedQuery;
          setParsed(parsedResult);
          setShowParsed(true);
          return parsedResult;
        }
      }
    } catch {
      // Fallback to regular search if Vexo AI cannot parse the query.
    } finally {
      setParsing(false);
    }
    return null;
  };

  const handleSearch = async () => {
    if (!query.trim()) return;

    let activeParsed = parsed;
    if (!activeParsed) {
      activeParsed = await parseWithVexo();
    }

    if (activeParsed?.keyword) {
      const params = new URLSearchParams();
      params.set("q", activeParsed.keyword);
      if (activeParsed.category) params.set("category", activeParsed.category);
      router.push(`/search?${params.toString()}`);
      return;
    }
    router.push(`/search?q=${encodeURIComponent(query)}`);
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
            aria-label="Bersihkan pencarian"
            title="Bersihkan pencarian"
            className="absolute right-14 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={handleSearch}
          disabled={!query.trim() || parsing}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-3 rounded-md bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
        >
          {parsing ? "Baca" : "Cari"}
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
