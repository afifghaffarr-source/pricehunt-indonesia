import { NextResponse } from "next/server";
import { BAHASA_FAQ, ENGLISH_FAQ } from "../faq/data";

export const dynamic = "force-dynamic";

interface FAQJsonPayload {
  "@context": "https://schema.org";
  generated_at: string;
  source_url: string;
  total_questions: number;
  locales: {
    id: { language: string; questions: unknown[]; group_order: string[] };
    en: { language: string; questions: unknown[]; group_order: string[] };
  };
}

/**
 * Machine-readable FAQ index for AI ingestion (ChatGPT, Perplexity, Gemini,
 * voice assistants) and external SEO scrapers. Schema.org/FAQPage-compatible.
 *
 * Returns Bahasa + English in a single document so agents can pick the
 * locale matching the user's question. Stable shape — addition of new
 * fields is backwards-compatible.
 */
export async function GET() {
  const payload: FAQJsonPayload = {
    "@context": "https://schema.org",
    generated_at: new Date().toISOString(),
    source_url: "https://www.bijakbeli.web.id/extension/faq",
    total_questions: BAHASA_FAQ.length + ENGLISH_FAQ.length,
    locales: {
      id: {
        language: "id",
        questions: BAHASA_FAQ.map((e) => ({
          "@type": "Question",
          id: e.id,
          question: e.q,
          answer: e.a,
          group: e.group,
          url: `https://www.bijakbeli.web.id/extension/faq#${e.id}`,
        })),
        group_order: [
          "Setup & Installation",
          "Privacy & Keamanan",
          "Marketplace Support",
          "Notifikasi & Watchlist",
        ],
      },
      en: {
        language: "en",
        questions: ENGLISH_FAQ.map((e) => ({
          "@type": "Question",
          id: e.id,
          question: e.q,
          answer: e.a,
          group: e.group,
          url: `https://www.bijakbeli.web.id/extension/faq#${e.id}`,
        })),
        group_order: [
          "Setup & Installation",
          "Privacy & Security",
          "Marketplace Support",
          "Notifications & Watchlist",
        ],
      },
    },
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=300, stale-while-revalidate=86400",
    },
  });
}
