import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !product) {
    return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
  }

  const { data: prices } = await supabase
    .from("prices")
    .select("*, marketplaces(name, display_name, color)")
    .eq("product_id", id)
    .order("price", { ascending: true });

  const { data: history } = await supabase
    .from("price_history")
    .select("price, recorded_at, marketplaces(name)")
    .eq("product_id", id)
    .order("recorded_at", { ascending: true });

  return NextResponse.json({
    product,
    prices: prices || [],
    priceHistory: history || [],
  });
}
