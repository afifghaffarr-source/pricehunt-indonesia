import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { getAIInsight } from "@/lib/marketplace/vexo-adapter";
import { checkPersistentRateLimit, getRequestIdentifier } from "@/lib/rate-limit";
import { isVexoConfigured } from "@/lib/vexo/client";
import type { VexoAIIntent } from "@/lib/vexo/types";

const MAX_CONTEXT_LENGTH = 2_000;
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
    const { intent, context } = body as { intent: VexoAIIntent; context: string };
    const safeContext = typeof context === "string" ? context.trim().slice(0, MAX_CONTEXT_LENGTH) : "";

    if (!intent || !safeContext) {
      return json(
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
      return json(
        { error: `Intent tidak valid. Gunakan: ${validIntents.join(", ")}` },
        { status: 400 }
      );
    }

    const rateLimit = await checkPersistentRateLimit({
      identifier: getRequestIdentifier(user.id, request),
      endpoint: "vexo-ai",
      limit: RATE_LIMIT_MAX,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });
    if (!rateLimit.allowed) {
      return json({ error: "Batas penggunaan AI tercapai. Coba lagi nanti." }, { status: 429 });
    }

    if (!isVexoConfigured()) {
      return json({
        result: null,
        source: "vexo-unavailable",
        message: "VexoAPI belum dikonfigurasi",
      });
    }

    const result = await getAIInsight(intent, safeContext);

    return json({
      result,
      intent,
      source: "vexo",
    });
  } catch (err) {
    console.error("Vexo AI error:", err);
    return json({
      result: null,
      error: "AI sedang tidak tersedia. Coba lagi beberapa saat lagi.",
    }, { status: 500 });
  }
}
