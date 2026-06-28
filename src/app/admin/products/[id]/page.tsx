import { requireAdminForPage } from "@/app/admin/_lib/guard";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { UpdateProductForm } from "./UpdateProductForm";
import { PriceManager } from "./PriceManager";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminProductEditPage({ params }: PageProps) {
  const { id } = await params;

  // Server-side guard: redirects guests and non-admins BEFORE fetching data.
  // Backed by admin_users (RLS-protected) via isUserAdmin().
  await requireAdminForPage();

  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (!product) notFound();

  // A-002: read from `offers` (post-114) instead of legacy `prices`.
  // Map to the shape PriceManager expects.
  const { data: offers } = await supabase
    .from("offers")
    .select("id, current_price, marketplace_id, marketplaces(id, display_name, name)")
    .eq("product_id", id)
    .order("current_price", { ascending: true });

  const pricesForManager = ((offers ?? []) as Array<{
    id: string;
    current_price: number | null;
    marketplace_id: string;
    marketplaces: { id: string; display_name: string; name: string } | { id: string; display_name: string; name: string }[] | null;
  }>).map((o) => ({
    id: o.id,
    price: o.current_price ?? 0,
    marketplace_id: o.marketplace_id,
    marketplaces: Array.isArray(o.marketplaces) ? o.marketplaces[0] ?? null : o.marketplaces,
  }));

  const { data: marketplaces } = await supabase
    .from("marketplaces")
    .select("*")
    .order("display_name");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/admin" className={buttonVariants({ variant: "ghost" }) + " mb-6"}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Kembali ke Admin
      </Link>

      <h1 className="mb-6 text-2xl font-bold">Edit: {product.name}</h1>

      <div className="space-y-8">
        <UpdateProductForm product={product} />

        <Card>
          <CardHeader>
            <CardTitle>Harga per Marketplace</CardTitle>
          </CardHeader>
          <CardContent>
            <PriceManager
              productId={id}
              prices={pricesForManager}
              marketplaces={marketplaces || []}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
