import { requireAuth } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Package, Database, TrendingUp, Globe } from "lucide-react";
import Link from "next/link";
import { formatRupiah } from "@/lib/utils";
import { CreateProductForm } from "./CreateProductForm";
import { AnalyticsDashboard } from "./AnalyticsDashboard";

export default async function AdminPage() {
  const user = await requireAuth();

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("preferences")
    .eq("id", user.id)
    .single();

  const prefs = (profile?.preferences as Record<string, unknown>) || {};
  if (!prefs.is_admin) {
    redirect("/dashboard");
  }

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: marketplaces } = await supabase
    .from("marketplaces")
    .select("*")
    .order("display_name");

  const totalProducts = products?.length || 0;
  const totalPrices = products?.reduce((sum, p) => sum + ((p.lowest_price || 0) > 0 ? 1 : 0), 0) || 0;
  const avgDealScore = products?.length
    ? Math.round(products.reduce((sum, p) => sum + (p.deal_score || 0), 0) / products.length)
    : 0;

  const categoryMap = new Map<string, number>();
  (products || []).forEach((p) => {
    categoryMap.set(p.category, (categoryMap.get(p.category) || 0) + 1);
  });
  const categoryData = Array.from(categoryMap.entries()).map(([name, count]) => ({ name, count }));

  const chartProducts = (products || []).map((p) => ({
    name: p.name.length > 20 ? p.name.slice(0, 20) + "..." : p.name,
    deal_score: p.deal_score || 0,
    lowest_price: p.lowest_price || 0,
  }));

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { data: priceHistoryData } = await supabase
    .from("price_history")
    .select("price, recorded_at")
    .gte("recorded_at", thirtyDaysAgo.toISOString().split("T")[0])
    .order("recorded_at", { ascending: true });

  const priceByDate = new Map<string, number[]>();
  (priceHistoryData || []).forEach((h) => {
    const d = h.recorded_at as string;
    if (!priceByDate.has(d)) priceByDate.set(d, []);
    priceByDate.get(d)!.push(h.price as number);
  });
  const priceTrends = Array.from(priceByDate.entries()).map(([date, prices]) => ({
    date: new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
    avg_price: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
  }));

  const popularSearches = [
    { term: "Samsung Galaxy", count: 142 },
    { term: "iPhone 15", count: 128 },
    { term: "Laptop Gaming", count: 96 },
    { term: "Headphone", count: 84 },
    { term: "Smartwatch", count: 71 },
    { term: "Nintendo Switch", count: 58 },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Kelola produk, harga, dan marketplace.</p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Produk</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalProducts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Produk Aktif</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalPrices}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Deal Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{avgDealScore}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Marketplace</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{marketplaces?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">Analytics</h2><Link href="/admin/registry" className={buttonVariants({ variant: "outline", size: "sm" }) + " gap-2"}><Globe className="h-4 w-4" />API Registry</Link></div>
        <AnalyticsDashboard
          products={chartProducts}
          categories={categoryData}
          priceTrends={priceTrends}
          searchTerms={popularSearches}
        />
      </div>

      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">Tambah Produk Baru</h2>
        <CreateProductForm categories={["Smartphone", "Laptop", "Audio", "Wearable", "Home Appliance", "Peripherals", "Gaming"]} />
      </div>

      <h2 className="mb-4 text-lg font-semibold">Semua Produk</h2>
      <div className="space-y-3">
        {(products || []).map((product) => (
          <Card key={product.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{product.name}</p>
                  <Badge variant="secondary">{product.category}</Badge>
                  <Badge variant="outline">Score: {product.deal_score}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {product.lowest_price ? formatRupiah(product.lowest_price) : "Belum ada harga"} &middot; {product.slug}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/product/${product.slug}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Lihat
                </Link>
                <Link
                  href={`/admin/products/${product.id}`}
                  className={buttonVariants({ variant: "default", size: "sm" })}
                >
                  Edit
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
