"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DealScoreBadge } from "@/components/product/DealScoreBadge";
import { formatRupiah, getMarketplaceName, getMarketplaceColor } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Marketplace } from "@/lib/types";
import { X, Plus, ArrowLeft, Minus } from "lucide-react";

interface CompareProduct {
  id: string;
  slug: string;
  name: string;
  category: string;
  image_url: string;
  lowest_price: number;
  highest_price: number;
  average_price: number;
  deal_score: number;
  specs: Record<string, string>;
  prices: { marketplace: Marketplace; price: number; in_stock: boolean }[];
}

export function CompareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ids = searchParams.get("ids")?.split(",").filter(Boolean) || [];

  const [products, setProducts] = useState<CompareProduct[]>([]);
  const [allProducts, setAllProducts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const idsKey = ids.join(",");

  useEffect(() => {
    const currentIds = searchParams.get("ids")?.split(",").filter(Boolean) || [];

    async function fetchData() {
      const supabase = createClient();

      const { data: all } = await supabase
        .from("products")
        .select("id, name")
        .order("name");
      setAllProducts(all || []);

      if (currentIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data: prods } = await supabase
        .from("products")
        .select("*")
        .in("id", currentIds);

      if (!prods) {
        setLoading(false);
        return;
      }

      const { data: allPrices } = await supabase
        .from("prices")
        .select("product_id, price, in_stock, marketplaces(name)")
        .in("product_id", currentIds);

      const pricesByProduct = new Map<string, CompareProduct["prices"]>();
      if (allPrices) {
        for (const p of allPrices) {
          const pid = p.product_id as string;
          if (!pricesByProduct.has(pid)) pricesByProduct.set(pid, []);
          const mp = p.marketplaces as unknown as { name: Marketplace } | null;
          pricesByProduct.get(pid)!.push({
            marketplace: mp?.name || "tokopedia",
            price: p.price as number,
            in_stock: p.in_stock as boolean,
          });
        }
      }

      const result: CompareProduct[] = prods.map((p) => ({
        id: p.id as string,
        slug: p.slug as string,
        name: p.name as string,
        category: p.category as string,
        image_url: (p.image_url as string) || "https://placehold.co/400x400/e2e8f0/64748b?text=Product",
        lowest_price: (p.lowest_price as number) || 0,
        highest_price: (p.highest_price as number) || 0,
        average_price: (p.average_price as number) || 0,
        deal_score: (p.deal_score as number) || 0,
        specs: (p.specs as Record<string, string>) || {},
        prices: pricesByProduct.get(p.id as string) || [],
      }));

      setProducts(result);
      setLoading(false);
    }

    fetchData();
  }, [idsKey, searchParams]);

  const addProduct = (id: string) => {
    if (ids.includes(id) || ids.length >= 4) return;
    const newIds = [...ids, id];
    router.push(`/compare?ids=${newIds.join(",")}`);
  };

  const removeProduct = (id: string) => {
    const newIds = ids.filter((i) => i !== id);
    if (newIds.length === 0) {
      router.push("/compare");
    } else {
      router.push(`/compare?ids=${newIds.join(",")}`);
    }
  };

  const allSpecKeys = [...new Set(products.flatMap((p) => Object.keys(p.specs)))];
  const allMarketplaces: Marketplace[] = ["tokopedia", "shopee", "bukalapak", "lazada", "blibli", "tiktok"];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/search" className={buttonVariants({ variant: "ghost" }) + " mb-6"}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Kembali
      </Link>

      <h1 className="mb-2 text-2xl font-bold">Bandingkan Produk</h1>
      <p className="mb-6 text-muted-foreground">
        Pilih hingga 4 produk untuk dibandingkan secara berdampingan.
      </p>

      {ids.length < 4 && (
        <div className="mb-6">
          <Select onValueChange={(val: string | null) => val && addProduct(val)}>
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue placeholder="Tambah produk..." />
            </SelectTrigger>
            <SelectContent>
              {allProducts
                .filter((p) => !ids.includes(p.id))
                .map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-96 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Plus className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              Pilih produk dari dropdown di atas untuk mulai membandingkan.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr>
                  <th className="w-40 p-3 text-left text-sm font-medium text-muted-foreground"></th>
                  {products.map((p) => (
                    <th key={p.id} className="p-3 text-center">
                      <div className="relative">
                        <button
                          onClick={() => removeProduct(p.id)}
                          className="absolute -right-1 -top-1 rounded-full bg-muted p-1 hover:bg-destructive hover:text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <div className="mx-auto mb-2 h-24 w-24 overflow-hidden rounded-lg bg-muted">
                          <Image src={p.image_url} alt={p.name} width={96} height={96} className="h-full w-full object-cover" />
                        </div>
                        <Link href={`/product/${p.slug}`} className="text-sm font-semibold hover:text-primary">
                          {p.name}
                        </Link>
                        <div className="mt-1">
                          <DealScoreBadge score={p.deal_score} />
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="p-3 text-sm font-medium text-muted-foreground">Harga Terendah</td>
                  {products.map((p) => (
                    <td key={p.id} className="p-3 text-center">
                      <span className="text-lg font-bold text-primary">{formatRupiah(p.lowest_price)}</span>
                    </td>
                  ))}
                </tr>
                <tr className="border-t">
                  <td className="p-3 text-sm font-medium text-muted-foreground">Harga Tertinggi</td>
                  {products.map((p) => (
                    <td key={p.id} className="p-3 text-center text-sm">{formatRupiah(p.highest_price)}</td>
                  ))}
                </tr>
                <tr className="border-t">
                  <td className="p-3 text-sm font-medium text-muted-foreground">Kategori</td>
                  {products.map((p) => (
                    <td key={p.id} className="p-3 text-center">
                      <Badge variant="secondary">{p.category}</Badge>
                    </td>
                  ))}
                </tr>

                {allMarketplaces.map((mp) => (
                  <tr key={mp} className="border-t">
                    <td className="p-3 text-sm font-medium" style={{ color: getMarketplaceColor(mp) }}>
                      {getMarketplaceName(mp)}
                    </td>
                    {products.map((p) => {
                      const mpPrice = p.prices.find((pr) => pr.marketplace === mp);
                      return (
                        <td key={p.id} className="p-3 text-center text-sm">
                          {mpPrice ? (
                            mpPrice.in_stock ? (
                              <span className="font-medium">{formatRupiah(mpPrice.price)}</span>
                            ) : (
                              <span className="text-muted-foreground">Stok habis</span>
                            )
                          ) : (
                            <Minus className="mx-auto h-4 w-4 text-muted-foreground" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {allSpecKeys.map((key) => (
                  <tr key={key} className="border-t">
                    <td className="p-3 text-sm font-medium text-muted-foreground">{key}</td>
                    {products.map((p) => (
                      <td key={p.id} className="p-3 text-center text-sm">
                        {p.specs[key] || <Minus className="mx-auto h-4 w-4 text-muted-foreground" />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
