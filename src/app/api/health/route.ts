import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const checks: Record<string, string> = {};

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("products").select("id").limit(1);
    checks.database = error ? `error: ${error.message}` : "ok";
  } catch (err) {
    checks.database = `error: ${err instanceof Error ? err.message : "unknown"}`;
  }

  checks.openai = process.env.OPENAI_API_KEY ? "configured" : "not_configured";
  checks.resend = process.env.RESEND_API_KEY ? "configured" : "not_configured";

  const allOk = Object.values(checks).every((v) => v === "ok" || v === "configured" || v === "not_configured");

  return NextResponse.json({
    status: allOk ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local",
    checks,
  });
}
