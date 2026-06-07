import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { DealScoreBadge } from "@/components/product/DealScoreBadge";
import { formatRupiah } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

interface ProductRecommendationsProps {
  currentProductId: string;
  category: string;
}

export async function ProductRecommendations({
  currentProductId,
  category,
}: ProductRecommendationsProps) {
  const supabase = await createClient();

  const { data: products } = await supabase
    .from("products")
    .select("id, slug, name, image_url, lowest_price, deal_score, category")
    .eq("category", category)
    .neq("id", currentProductId)
    .order("deal_score", { ascending: false })
    .limit(4);

  if (!products || products.length === 0) {
    const { data: fallback } = await supabase
      .from("products")
      .select("id, slug, name, image_url, lowest_price, deal_score, category")
      .neq("id", currentProductId)
      .order("deal_score", { ascending: false })
      .limit(4);

    if (!fallback || fallback.length === 0) return null;

    return (
      <div>
        <h2 className="mb-4 text-xl font-bold">Produk Lainnya</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {fallback.map((p) => (
            <RecommendationCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold">Produk Serupa</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {products.map((p) => (
          <RecommendationCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}

function RecommendationCard({
  product,
}: {
  product: {
    slug: string;
    name: string;
    image_url: string | null;
    lowest_price: number | null;
    deal_score: number | null;
  };
}) {
  return (
    <Link href={`/product/${product.slug}`}>
      <Card className="group overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5">
        <div className="relative aspect-square overflow-hidden bg-muted">
          <Image
            src={product.image_url || "https://placehold.co/400x400/e2e8f0/64748b?text=Product"}
            alt={product.name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, 25vw"
          />
        </div>
        <CardContent className="p-3">
          <h3 className="mb-1 line-clamp-2 text-xs font-semibold group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-primary">
              {product.lowest_price ? formatRupiah(product.lowest_price) : "-"}
            </span>
            {product.deal_score !== null && (
              <DealScoreBadge score={product.deal_score} showLabel={false} />
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
