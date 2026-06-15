/* eslint-disable @typescript-eslint/no-explicit-any */
// Pre-existing `any` usages; tracked under Phase 5 type-safety backlog.
"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { SearchBar } from "@/components/search/SearchBar";
import { ProductCard } from "@/components/product/ProductCard";
import { DiscoveredProductCard } from "@/components/product/DiscoveredProductCard";
import { VexoSearchBadge } from "@/components/search/VexoSearchBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { SectionHeading } from "@/components/common/SectionHeading";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { createClient } from "@/lib/supabase/client";
import type { Product, Marketplace, MarketplacePrice } from "@/lib/types";
import type { BijakBeliDiscoveredProduct } from "@/lib/vexo/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal, Globe } from "lucide-react";

const categories = [
  "Smartphone", "Laptop", "Audio", "Wearable",
  "Home Appliance", "Peripherals", "Gaming",
];

function transformDbProduct(row: Record<string, unknown>, prices: Record<string, unknown>[]): Product {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    category: row.category as string,
    description: (row.description as string) || "",
    imageUrl: (row.image_url as string) || "https://placehold.co/400x400/e2e8f0/64748b?text=Product",
    prices: prices.map((p) => {
      const mp = p.marketplaces as Record<string, unknown> | null;
      return {
        marketplace: (mp?.name as Marketplace) || "tokopedia",
        price: p.price as number,
        url: (p.url as string) || "",
        seller: (p.seller as string) || "",
        sellerRating: Number(p.seller_rating) || 0,
        inStock: p.in_stock as boolean,
        shippingCost: (p.shipping_cost as number) || 0,
        lastUpdated: (p.last_updated as string) || "",
      } as MarketplacePrice;
    }),
    priceHistory: [],
    lowestPrice: (row.lowest_price as number) || 0,
    highestPrice: (row.highest_price as number) || 0,
    averagePrice: (row.average_price as number) || 0,
    dealScore: (row.deal_score as number) || 0,
    aiVerdict: (row.ai_verdict as string) || "",
    specs: (row.specs as Record<string, string>) || {},
  };
}

export function SearchPageContent() {
// Pre-existing Vexo/Supabase response typing (Phase 5). replace `any` usages with proper types.

  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialCategory = searchParams.get("category") || "";

  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<string | undefined>(
    initialCategory || undefined
  );
  const [sortBy, setSortBy] = useState<string>("deal-score");
  const [products, setProducts] = useState<Product[]>([]);
  const [discovered, setDiscovered] = useState<BijakBeliDiscoveredProduct[]>([]);
  const [vexoStatus, setVexoStatus] = useState<"loading" | "ok" | "error" | "unavailable">("unavailable");
  const [vexoEnabled, setVexoEnabled] = useState(false); // Explicit opt-in
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);

      try {
        // Use /api/search which now includes prices
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        if (category) params.set("category", category);
        params.set("limit", "100");
        // Don't include vexo in main search - handled separately

        const res = await fetch(`/api/search?${params.toString()}`);
        const data = await res.json();

        if (!res.ok || data.error) {
          console.error("Search API error:", data.error);
          setProducts([]);
          setLoading(false);
          return;
        }

        // Transform API response to Product type
        const result: Product[] = (data.results || []).map((p: any) => {
          const prices = (p.prices || []).map((pr: any) => ({
            marketplace: pr.marketplace || pr.marketplaces?.name || "tokopedia",
            price: pr.price,
            url: pr.url,
            seller: pr.seller || "",
            sellerRating: pr.sellerRating || pr.seller_rating || 0,
            inStock: pr.inStock ?? pr.in_stock ?? true,
            shippingCost: pr.shippingCost || pr.shipping_cost || 0,
            lastUpdated: pr.lastUpdated || pr.last_updated || "",
          }));

          return {
            id: p.id,
            slug: p.slug,
            name: p.name,
            category: p.category,
            description: p.description || "",
            imageUrl: p.imageUrl || p.image_url || "https://placehold.co/400x400/e2e8f0/64748b?text=Product",
            prices,
            priceHistory: p.priceHistory || p.price_history || [],
            lowestPrice: p.lowestPrice || p.lowest_price || 0,
            highestPrice: p.highestPrice || p.highest_price || 0,
            averagePrice: p.averagePrice || p.average_price || 0,
            dealScore: p.dealScore || p.deal_score || 0,
            aiVerdict: p.aiVerdict || p.ai_verdict || "",
            specs: p.specs || {},
          };
        });

        // Client-side sorting
        switch (sortBy) {
          case "price-asc":
            result.sort((a, b) => a.lowestPrice - b.lowestPrice);
            break;
          case "price-desc":
            result.sort((a, b) => b.lowestPrice - a.lowestPrice);
            break;
          case "deal-score":
            result.sort((a, b) => b.dealScore - a.dealScore);
            break;
          case "name":
            result.sort((a, b) => a.name.localeCompare(b.name));
            break;
        }

        setProducts(result);
      } catch (error) {
        console.error("Search error:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [query, category, sortBy]);

  // Vexo search - only when explicitly enabled
  useEffect(() => {
    if (!query || !vexoEnabled) {
      setDiscovered([]);
      setVexoStatus("unavailable");
      return;
    }

    let cancelled = false;
    const timeoutId = setTimeout(() => {
      async function fetchVexo() {
        setVexoStatus("loading");
        try {
          const res = await fetch(`/api/vexo/search?q=${encodeURIComponent(query)}&limit=8`);
          const data = await res.json();

          if (cancelled) return;

          if (data.source === "vexo" && data.results?.length > 0) {
            setDiscovered(data.results);
            setVexoStatus("ok");
          } else if (data.source === "vexo-unavailable") {
            setVexoStatus("unavailable");
          } else {
            setVexoStatus("error");
          }
        } catch {
          if (!cancelled) setVexoStatus("error");
        }
      }

      fetchVexo();
    }, 800); // 800ms debounce

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [query, vexoEnabled]);

  const handleSearch = (q: string) => {
    setQuery(q);
    if (!q) {
      setDiscovered([]);
      setVexoStatus("unavailable");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <SectionHeading
          title={query ? `Hasil pencarian: "${query}"` : "Semua Produk"}
          subtitle={loading ? "Memuat..." : `${products.length} produk dari database`}
        />
        {/* A11y: announce result count changes to screen readers */}
        <div role="status" aria-live="polite" className="sr-only">
          {loading
            ? "Memuat hasil pencarian"
            : `${products.length} produk${query ? ` untuk "${query}"` : ""} ditemukan`}
        </div>
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
          value={category || "all"}
          onValueChange={(val: string | null) =>
            setCategory(val === "all" || val === null ? undefined : val)
          }
        >
          <SelectTrigger className="w-[160px]" aria-label="Filter kategori">
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
          value={sortBy}
          onValueChange={(val: string | null) => setSortBy(val || "deal-score")}
        >
          <SelectTrigger className="w-[180px]" aria-label="Urutkan hasil">
            <SelectValue placeholder="Urutkan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="deal-score">Deal Score</SelectItem>
            <SelectItem value="price-asc">Harga: Rendah ke Tinggi</SelectItem>
            <SelectItem value="price-desc">Harga: Tinggi ke Rendah</SelectItem>
            <SelectItem value="name">Nama A-Z</SelectItem>
          </SelectContent>
        </Select>
        {category && (
          <Badge
            variant="secondary"
            className="cursor-pointer"
            onClick={() => setCategory(undefined)}
          >
            {category} ×
          </Badge>
        )}
      </div>

      {loading ? (
        <LoadingSkeleton count={8} variant="card" />
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Produk tidak ditemukan di database"
          description={`Tidak ada produk yang cocok dengan "${query}" di database lokal.`}
        />
      )}

      {discovered.length > 0 && (
        <div className="mt-10">
          <div className="mb-4 flex items-center gap-3">
            <SectionHeading
              title="Ditemukan dari Internet"
              subtitle={`${discovered.length} hasil via VexoAPI`}
            />
            <VexoSearchBadge source="vexo-google" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {discovered.map((item) => (
              <DiscoveredProductCard key={item.id} product={item} />
            ))}
          </div>
        </div>
      )}

      {query && vexoStatus === "loading" && products.length > 0 && (
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Globe className="h-4 w-4 animate-pulse" />
          Mencari dari internet...
        </div>
      )}
    </div>
  );
}
