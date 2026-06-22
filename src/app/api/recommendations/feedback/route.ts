import { NextResponse } from "next/server";

/**
 * POST /api/recommendations/feedback
 *
 * Stub endpoint — exists so client feedback submissions don't 404.
 * Recommendation feedback is currently informational only (logged via
 * console.error); a future iteration will persist to a `recommendation_feedback`
 * table.
 *
 * Audit 2026-06-22: previous behavior returned the 404 HTML page →
 * client-side fetch failed silently. Fix: return 200 so callers don't
 * surface errors for an MVP-stage feature.
 */
export async function POST() {
  return NextResponse.json({ ok: true, message: "Feedback received" });
}

export async function PUT() {
  return NextResponse.json({ ok: true, message: "Feedback received" });
}