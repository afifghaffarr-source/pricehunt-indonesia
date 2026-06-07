"use client";

import { useSearchParams } from "next/navigation";
import { useState, useMemo } from "react";
import { SearchBar } from "@/components/search/SearchBar";
import { ProductCard } from "@/components/product/ProductCard";
import { EmptyState } from "@/components/common/EmptyState";
import { SectionHeading } from "@/components/common/SectionHeading";
import { mockProducts, categories, searchProducts } from "@/lib/mock-data";
import type { FilterOptions } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal } from "lucide-react";

export function SearchPageContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialCategory = searchParams.get("category") || "";

  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<FilterOptions>({
    category: initialCategory || undefined,
    sortBy: "deal-score",
  });

  const results = useMemo(() => {
    let products = query ? searchProducts(query) : [...mockProducts];

    if (filters.category) {
      products = products.filter((p) => p.category === filters.category);
    }

    if (filters.sortBy) {
      switch (filters.sortBy) {
        case "price-asc":
          products.sort((a, b) => a.lowestPrice - b.lowestPrice);
          break;
        case "price-desc":
          products.sort((a, b) => b.lowestPrice - a.lowestPrice);
          break;
        case "deal-score":
          products.sort((a, b) => b.dealScore - a.dealScore);
          break;
        case "name":
          products.sort((a, b) => a.name.localeCompare(b.name));
          break;
      }
    }

    return products;
  }, [query, filters]);

  const handleSearch = (q: string) => {
    setQuery(q);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <SectionHeading
          title={query ? `Hasil pencarian: "${query}"` : "Semua Produk"}
          subtitle={`${results.length} produk ditemukan`}
        />
        <SearchBar
          defaultValue={query}
          onSearch={handleSearch}
          className="mt-4"
        />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <SlidersHorizontal className="h-4 w-4" />
          Filter:
        </div>
        <Select
          value={filters.category || "all"}
          onValueChange={(val: string | null) =>
            setFilters((prev) => ({
              ...prev,
              category: val === "all" || val === null ? undefined : val,
            }))
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.sortBy || "deal-score"}
          onValueChange={(val: string | null) =>
            setFilters((prev) => ({
              ...prev,
              sortBy: (val || "deal-score") as FilterOptions["sortBy"],
            }))
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Urutkan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="deal-score">Deal Score</SelectItem>
            <SelectItem value="price-asc">Harga: Rendah ke Tinggi</SelectItem>
            <SelectItem value="price-desc">Harga: Tinggi ke Rendah</SelectItem>
            <SelectItem value="name">Nama A-Z</SelectItem>
          </SelectContent>
        </Select>
        {filters.category && (
          <Badge
            variant="secondary"
            className="cursor-pointer"
            onClick={() =>
              setFilters((prev) => ({ ...prev, category: undefined }))
            }
          >
            {filters.category} ×
          </Badge>
        )}
      </div>

      {results.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Produk tidak ditemukan"
          description={`Tidak ada produk yang cocok dengan "${query}". Coba kata kunci lain atau jelajahi kategori.`}
        />
      )}
    </div>
  );
}
