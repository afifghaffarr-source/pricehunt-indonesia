import { NextRequest, NextResponse } from "next/server";
import { getAIInsight } from "@/lib/marketplace/vexo-adapter";
import { isVexoConfigured } from "@/lib/vexo/client";
import type { VexoAIIntent } from "@/lib/vexo/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { intent, context } = body as { intent: VexoAIIntent; context: string };

    if (!intent || !context) {
      return NextResponse.json(
        { error: "intent dan context diperlukan" },
        { status: 400 }
      );
    }

    const validIntents: VexoAIIntent[] = [
      "smart-search",
      "product-summary",
      "deal-verdict",
      "product-matcher",
      "general",
    ];
    if (!validIntents.includes(intent)) {
      return NextResponse.json(
        { error: `Intent tidak valid. Gunakan: ${validIntents.join(", ")}` },
        { status: 400 }
      );
    }

    if (!isVexoConfigured()) {
      return NextResponse.json({
        result: null,
        source: "vexo-unavailable",
        message: "VexoAPI belum dikonfigurasi",
      });
    }

    const result = await getAIInsight(intent, context);

    return NextResponse.json({
      result,
      intent,
      source: "vexo",
    });
  } catch (err) {
    return NextResponse.json({
      result: null,
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
