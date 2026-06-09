import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/api-auth";
import { sendEmailDigest } from "@/lib/email";
import { logJob } from "@/lib/job-logger";

/**
 * Cron job: Send weekly email digest to opted-in users
 * 
 * Includes:
 * - Wishlist items with current prices
 * - Top deals of the week (high deal_score)
 * - Buy/wait recommendations
 * 
 * Users must opt-in via preferences.email_digest_enabled = true
 * Called weekly by Vercel Cron
 */
export async function GET(request: NextRequest) {
  // ✅ SECURITY: Require cron secret (fail closed)
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const startTime = Date.now();

  try {
    // ✅ Call comprehensive email digest function
    const result = await sendEmailDigest();

    const duration = Date.now() - startTime;

    // ✅ Log job result for admin observability
    await logJob("cron_digest", "success", {
      processedCount: result.sent + result.skipped + result.failed,
      successCount: result.sent,
      failedCount: result.failed,
      errorSummary: result.failed > 0 ? `${result.failed} email(s) failed to send` : undefined,
    });

    return NextResponse.json({
      success: true,
      sent: result.sent,
      skipped: result.skipped,
      failed: result.failed,
      duration,
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    console.error("[Cron Digest] Failed:", err);

    // ✅ Log failure for admin visibility
    await logJob("cron_digest", "failed", {
      processedCount: 0,
      successCount: 0,
      failedCount: 0,
      errorSummary: errorMessage,
    });

    return NextResponse.json(
      { error: "Digest job failed", message: errorMessage },
      { status: 500 }
    );
  }
}
