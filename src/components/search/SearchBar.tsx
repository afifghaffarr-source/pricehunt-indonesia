"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  defaultValue?: string;
  placeholder?: string;
  size?: "default" | "lg";
  className?: string;
  onSearch?: (query: string) => void;
}

export function SearchBar({
  defaultValue = "",
  placeholder = "Cari produk, misal: Samsung Galaxy S24...",
  size = "default",
  className,
  onSearch,
}: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue);
  const router = useRouter();

  const handleSearch = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    if (onSearch) {
      onSearch(trimmed);
    } else {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  }, [query, onSearch, router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className={cn("relative flex w-full items-center", className)}>
      <Search
        className={cn(
          "absolute left-3 text-muted-foreground",
          size === "lg" ? "h-5 w-5" : "h-4 w-4"
        )}
      />
      <Input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          "pr-20",
          size === "lg"
            ? "h-14 pl-12 text-base rounded-xl"
            : "h-10 pl-10 rounded-lg"
        )}
      />
      {query && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-12 h-8 w-8"
          onClick={() => setQuery("")}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Hapus</span>
        </Button>
      )}
      <Button
        onClick={handleSearch}
        className={cn(
          "absolute right-1",
          size === "lg" ? "h-12 px-5" : "h-8 px-3"
        )}
        disabled={!query.trim()}
      >
        Cari
      </Button>
    </div>
  );
}
