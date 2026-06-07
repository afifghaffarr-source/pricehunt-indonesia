import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json({ error: "productId diperlukan" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: product } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (!product) {
      return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
    }

    const { data: cached } = await supabase
      .from("ai_cache")
      .select("verdict, created_at")
      .eq("product_id", productId)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached) {
      return NextResponse.json({ verdict: cached.verdict, source: "cache" });
    }

    const { data: prices } = await supabase
      .from("prices")
      .select("price, marketplaces(display_name)")
      .eq("product_id", productId)
      .eq("in_stock", true)
      .order("price", { ascending: true });

    const { data: history } = await supabase
      .from("price_history")
      .select("price, recorded_at")
      .eq("product_id", productId)
      .gte("recorded_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
      .order("recorded_at", { ascending: true });

    if (!process.env.OPENAI_API_KEY) {
      const fallback = generateFallbackVerdict(product, prices || [], history || []);
      return NextResponse.json({ verdict: fallback, source: "fallback" });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const priceSummary = (prices || [])
      .map((p) => {
        const mp = p.marketplaces as unknown as { display_name: string } | null;
        return `${mp?.display_name || "Unknown"}: Rp${p.price.toLocaleString("id-ID")}`;
      })
      .join(", ");

    const historySummary = (history || [])
      .slice(-10)
      .map((h) => `${h.recorded_at}: Rp${h.price.toLocaleString("id-ID")}`)
      .join(", ");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Kamu adalah AI Price Advisor untuk website perbandingan harga Indonesia. Berikan rekomendasi singkat (2-3 kalimat) dalam bahasa Indonesia tentang apakah produk ini layak dibeli sekarang atau lebih baik tunggu. Gunakan data harga dan tren yang diberikan.",
        },
        {
          role: "user",
          content: `Produk: ${product.name}\nKategori: ${product.category}\nHarga terendah: Rp${product.lowest_price?.toLocaleString("id-ID")}\nHarga tertinggi: Rp${product.highest_price?.toLocaleString("id-ID")}\nDeal Score: ${product.deal_score}/100\n\nHarga per marketplace: ${priceSummary}\n\nTren harga 30 hari terakhir: ${historySummary}\n\nBeri rekomendasi: beli sekarang atau tunggu?`,
        },
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    const verdict =
      completion.choices[0]?.message?.content || "Tidak dapat menghasilkan rekomendasi saat ini.";

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("ai_cache").insert({
      product_id: productId,
      verdict,
      model: "gpt-4o-mini",
      expires_at: expiresAt,
    });

    await supabase
      .from("products")
      .update({ ai_verdict: verdict })
      .eq("id", productId);

    return NextResponse.json({ verdict, source: "openai" });
  } catch (err) {
    console.error("AI Advisor error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada AI Advisor" },
      { status: 500 }
    );
  }
}

function generateFallbackVerdict(
  product: { name: string; lowest_price: number; highest_price: number; deal_score: number },
  prices: { price: number }[],
  history: { price: number; recorded_at: string }[]
): string {
  const score = product.deal_score;

  if (score >= 85) {
    return `Harga ${product.name} saat ini sangat bagus! Deal score ${score}/100 menunjukkan ini harga terbaik. Beli sekarang sebelum harga naik.`;
  }
  if (score >= 70) {
    const trend = history.length >= 2 && history[history.length - 1].price < history[0].price ? "turun" : "stabil";
    return `Harga ${product.name} tergolong bagus (score ${score}/100). Tren harga 30 hari terakhir ${trend}. Worth it untuk dibeli sekarang.`;
  }
  if (score >= 50) {
    return `Harga ${product.name} di rata-rata pasar (score ${score}/100). Ada ${prices.length} marketplace tersedia. Bandingkan harga dan cek ongkir sebelum beli.`;
  }
  return `Harga ${product.name} saat ini di atas rata-rata (score ${score}/100). Kami sarankan tunggu beberapa hari atau cek marketplace lain untuk harga lebih baik.`;
}
