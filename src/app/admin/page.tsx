import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { requireAdminForPage } from "./_lib/guard";
import { createClient } from "@/lib/supabase/server";
import { CreateProductForm } from "./CreateProductForm";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Server-side guard: redirects guests and non-admins before rendering.
  // Backed by admin_users (RLS-protected) via isUserAdmin().
  await requireAdminForPage();

  const supabase = await createClient();

  // Fetch categories for the create-product form.
  const { data: categoryRows } = await supabase
    .from("products")
    .select("category");

  const categories = Array.from(
    new Set((categoryRows ?? []).map((r) => r.category).filter(Boolean) as string[])
  ).sort();

  // Fetch products list (newest first).
  const { data: products } = await supabase
    .from("products")
    .select("id, name, slug, category, image_url, lowest_price, deal_score, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Kelola produk, harga, dan data collection.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/data-collection" className={buttonVariants({ variant: "default" })}>
            Data Collection
          </Link>
          <Link href="/admin/registry" className={buttonVariants({ variant: "outline" })}>
            API Registry
          </Link>
        </div>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Tambah Produk</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateProductForm categories={categories.length > 0 ? categories : ["Smartphone", "Laptop", "Elektronik", "Fashion"]} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Produk</CardTitle>
        </CardHeader>
        <CardContent>
          {(products ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada produk.</p>
          ) : (
            <ul className="divide-y">
              {(products ?? []).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.category ?? "Tanpa kategori"}
                      {p.lowest_price ? ` · Mulai Rp ${Number(p.lowest_price).toLocaleString("id-ID")}` : ""}
                    </p>
                  </div>
                  <Link
                    href={`/admin/products/${p.id}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Edit
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
