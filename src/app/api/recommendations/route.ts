import { NextResponse } from "next/server";

/**
 * GET /api/recommendations
 *
 * Stub endpoint — the real recommendation engine is split across
 * `/api/recommendation/buy-or-wait` (VexoAI-powered "buy now or wait")
 * and `/api/recommendation/fake-discount` (VexoAI-powered discount
 * authenticity). This route exists so client components that ask for a
 * generic "recommendations" feed don't fall through to Next.js's HTML
 * 404 page (which causes `Unexpected token '<'` JSON parse errors in
 * the browser console).
 *
 * Audit 2026-06-22: previous behavior returned the 404 HTML page →
 * `Failed to load recommendations: SyntaxError: Unexpected token '<'`
 * logged on every page that mounted <AIRecommendations />. Fix: return
 * an empty JSON array so callers can iterate safely.
 */
export async function GET() {
  return NextResponse.json({
    recommendations: [],
    message:
      "Use /api/recommendation/buy-or-wait or /api/recommendation/fake-discount for VexoAI-powered recommendations.",
    total: 0,
  });
}