"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn, formatRupiah } from "@/lib/utils";

interface SearchSuggestion {
  id: string;
  name: string;
  slug: string;
  category: string;
  lowest_price: number | null;
}

interface SearchSuggestionsProps {
  className?: string;
}

export function SearchSuggestions({ className }: SearchSuggestionsProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShow(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuggestions = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=5`);
      const data = await res.json();
      setSuggestions(data.results || []);
    } catch {
      setSuggestions([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query, fetchSuggestions]);

  const handleSelect = (slug: string) => {
    setQuery("");
    setShow(false);
    router.push(`/product/${slug}`);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setShow(true);
    if (e.target.value.length < 2) {
      setSuggestions([]);
    }
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => query.length >= 2 && setShow(true)}
          placeholder="Cari produk cepat..."
          className="pl-10 pr-8"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setShow(false); setSuggestions([]); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {show && suggestions.length > 0 && (
        <div className="absolute top-full z-50 mt-1 w-full rounded-lg border bg-popover shadow-md">
          {suggestions.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSelect(s.slug)}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-accent"
            >
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.category}</p>
              </div>
              {s.lowest_price && (
                <span className="text-sm font-semibold text-primary">
                  {formatRupiah(s.lowest_price)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {show && loading && query.length >= 2 && (
        <div className="absolute top-full z-50 mt-1 w-full rounded-lg border bg-popover p-4 text-center text-sm text-muted-foreground shadow-md">
          Mencari...
        </div>
      )}
    </div>
  );
}
