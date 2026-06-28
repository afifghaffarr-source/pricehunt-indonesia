import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/api-auth";
import OpenAI from "openai";

export async function POST(request: NextRequest) {
  // ✅ SECURITY: Require authentication (expensive OpenAI operation)
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json({ error: "productId required" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: product } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // P7-Post: read from price_snapshots (joined to offers for product_id).
    // The legacy `price_history` table was dropped in migration 129.
    const { data: history } = await supabase
      .from("price_snapshots")
      .select("current_price, captured_at, offers!inner(product_id)")
      .eq("offers.product_id", productId)
      .order("captured_at", { ascending: true });

    if (!history || history.length < 7) {
      return NextResponse.json({
        prediction: {
          trend: "insufficient_data",
          message: "Perlu minimal 7 hari data untuk prediksi.",
          confidence: 0,
        },
      });
    }

    const prices = history.map((h) => h.current_price as number);

    const recentAvg = prices.slice(-7).reduce((a, b) => a + b, 0) / 7;
    const olderAvg = prices.slice(0, 7).reduce((a, b) => a + b, 0) / 7;
    const trendPercent = ((recentAvg - olderAvg) / olderAvg) * 100;

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    const volatility = ((maxPrice - minPrice) / avgPrice) * 100;

    let trend: "rising" | "falling" | "stable";
    let confidence: number;

    if (Math.abs(trendPercent) < 2) {
      trend = "stable";
      confidence = 70;
    } else if (trendPercent > 0) {
      trend = "rising";
      confidence = Math.min(90, 60 + Math.abs(trendPercent) * 3);
    } else {
      trend = "falling";
      confidence = Math.min(90, 60 + Math.abs(trendPercent) * 3);
    }

    const predictions = [];
    for (let days = 7; days <= 30; days += 7) {
      const dailyChange = trendPercent / 30;
      const predicted = Math.round(recentAvg * (1 + (dailyChange * days) / 100));
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      predictions.push({
        date: futureDate.toISOString().split("T")[0],
        predictedPrice: predicted,
        days,
      });
    }

    let aiAnalysis = "";
    if (process.env.OPENAI_API_KEY) {
      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const priceData = history.slice(-14).map((h) =>
          `${h.captured_at}: Rp${(h.current_price as number).toLocaleString("id-ID")}`
        ).join("\n");

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "Kamu adalah AI Price Predictor. Analisis data harga historis dan berikan prediksi singkat (2-3 kalimat) dalam bahasa Indonesia tentang tren harga ke depan.",
            },
            {
              role: "user",
              content: `Produk: ${product.name}\nHarga saat ini: Rp${(product.lowest_price as number)?.toLocaleString("id-ID")}\nTren 30 hari: ${trend} (${trendPercent > 0 ? "+" : ""}${trendPercent.toFixed(1)}%)\nVolatilitas: ${volatility.toFixed(1)}%\nHarga terendah: Rp${minPrice.toLocaleString("id-ID")}\nHarga tertinggi: Rp${maxPrice.toLocaleString("id-ID")}\n\nData 14 hari terakhir:\n${priceData}\n\nBeri prediksi harga untuk 1-4 minggu ke depan.`,
            },
          ],
          max_tokens: 200,
          temperature: 0.7,
        });

        aiAnalysis = completion.choices[0]?.message?.content || "";
      } catch (err) {
        console.error("OpenAI prediction error:", err);
        // AI fallback
      }
    }

    if (!aiAnalysis) {
      if (trend === "falling") {
        aiAnalysis = `Harga ${product.name} sedang tren turun ${Math.abs(trendPercent).toFixed(1)}% dalam 30 hari terakhir. Prediksi: harga kemungkinan akan terus turun atau stabil di level saat ini dalam 1-2 minggu ke depan. Ini saat yang baik untuk menunggu atau beli jika harga sudah di bawah Rp${Math.round(recentAvg * 0.95).toLocaleString("id-ID")}.`;
      } else if (trend === "rising") {
        aiAnalysis = `Harga ${product.name} naik ${trendPercent.toFixed(1)}% dalam 30 hari terakhir. Prediksi: harga mungkin akan terus naik dalam 1-2 minggu ke depan. Pertimbangkan untuk beli sekarang sebelum harga lebih tinggi.`;
      } else {
        aiAnalysis = `Harga ${product.name} relatif stabil dalam 30 hari terakhir. Prediksi: harga akan tetap di kisaran saat ini. Beli kapan saja tidak masalah.`;
      }
    }

    return NextResponse.json({
      prediction: {
        trend,
        trendPercent: Math.round(trendPercent * 10) / 10,
        confidence: Math.round(confidence),
        volatility: Math.round(volatility * 10) / 10,
        currentPrice: product.lowest_price,
        averagePrice: avgPrice,
        minPrice,
        maxPrice,
        predictions,
        analysis: aiAnalysis,
        dataPoints: history.length,
      },
    });
  } catch (err) {
    console.error("Prediction error:", err);
    return NextResponse.json(
      { error: "Prediction failed" },
      { status: 500 }
    );
  }
}
