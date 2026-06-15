import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { checkPersistentRateLimit, getRequestIdentifier } from "@/lib/rate-limit";
import { isOfferInStock, type OfferRow } from "@/lib/ingestion/adapter";
import OpenAI from "openai";

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 20;

function json(data: unknown, init?: ResponseInit) {
  const response = NextResponse.json(data, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return json({ error: "Silakan login untuk memakai AI shopping advisor." }, { status: 401 });
    }

    const body = await request.json();
    const { productId } = body as { productId?: string };

    if (!productId || typeof productId !== "string" || productId.length > 80) {
      return json({ error: "productId tidak valid" }, { status: 400 });
    }

    const rateLimit = await checkPersistentRateLimit({
      identifier: getRequestIdentifier(user.id, request),
      endpoint: "ai-advisor",
      limit: RATE_LIMIT_MAX,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });
    if (!rateLimit.allowed) {
      return json({ error: "Batas penggunaan AI tercapai. Coba lagi nanti." }, { status: 429 });
    }

    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: product } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (!product) {
      return json({ error: "Produk tidak ditemukan" }, { status: 404 });
    }

    const { data: cached } = await adminClient
      .from("ai_cache")
      .select("verdict, created_at")
      .eq("product_id", productId)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached) {
      return json({ verdict: (cached as { verdict: string }).verdict, source: "cache" });
    }

    // A-002: read from `offers` (post-114) instead of legacy `prices`.
    // Map to in-stock subset using the adapter's stock_status logic.
    const { data: offers } = await supabase
      .from("offers")
      .select("id, current_price, stock_status, is_active, marketplace_id, marketplaces(display_name)")
      .eq("product_id", productId);

    const inStockOffers = ((offers ?? []) as OfferRow[])
      .filter((o) => isOfferInStock(o.stock_status, o.is_active) && (o.current_price ?? 0) > 0)
      .sort((a, b) => (a.current_price ?? 0) - (b.current_price ?? 0));

    const { data: history } = await supabase
      .from("price_history")
      .select("price, recorded_at")
      .eq("product_id", productId)
      .gte("recorded_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
      .order("recorded_at", { ascending: true });

    if (!process.env.OPENAI_API_KEY) {
      const fallback = generateFallbackVerdict(product, inStockOffers, history || []);
      return json({ verdict: fallback, source: "fallback" });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const priceSummary = inStockOffers
      .map((o) => {
        const mp = (o as OfferRow & { marketplaces?: { display_name?: string } | { display_name: string }[] | null }).marketplaces;
        const mpDisplay = Array.isArray(mp) ? mp[0]?.display_name : mp?.display_name;
        return `${mpDisplay || "Unknown"}: Rp${(o.current_price ?? 0).toLocaleString("id-ID")}`;
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
    await adminClient.from("ai_cache").insert({
      product_id: productId,
      verdict,
      model: "gpt-4o-mini",
      expires_at: expiresAt,
    } as never);

    await adminClient
      .from("products")
      .update({ ai_verdict: verdict } as never)
      .eq("id", productId);

    return json({ verdict, source: "openai" });
  } catch (err) {
    console.error("AI Advisor error:", err);
    return json(
      { error: "Terjadi kesalahan pada AI Advisor" },
      { status: 500 }
    );
  }
}

function generateFallbackVerdict(
  product: { name: string; lowest_price: number; highest_price: number; deal_score: number },
  offers: Array<{ current_price: number | null }>,
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
    return `Harga ${product.name} di rata-rata pasar (score ${score}/100). Ada ${offers.length} marketplace tersedia. Bandingkan harga dan cek ongkir sebelum beli.`;
  }
  return `Harga ${product.name} saat ini di atas rata-rata (score ${score}/100). Kami sarankan tunggu beberapa hari atau cek marketplace lain untuk harga lebih baik.`;
}
