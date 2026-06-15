import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/app-url";
import { checkPersistentRateLimit } from "@/lib/rate-limit";

/**
 * Rate limit: 3 requests per email per hour, 20 per IP per hour.
 * Prevents email bombing + account enumeration via timing attacks.
 */
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_PER_EMAIL = 3;
const RATE_LIMIT_PER_IP = 20;

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email diperlukan" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const ip = getClientIp(request);

    // Rate limit by email (prevents targeted email bombing of one user)
    const emailLimit = await checkPersistentRateLimit({
      identifier: `email:${normalizedEmail}`,
      endpoint: "auth/forgot-password",
      limit: RATE_LIMIT_PER_EMAIL,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });
    if (!emailLimit.allowed) {
      // Use generic message — don't leak rate limit state to attacker
      return NextResponse.json(
        {
          success: true,
          message: "Jika email terdaftar, link reset akan dikirim",
        },
        { status: 200 }
      );
    }

    // Rate limit by IP (prevents broad enumeration from one host)
    const ipLimit = await checkPersistentRateLimit({
      identifier: `ip:${ip}`,
      endpoint: "auth/forgot-password",
      limit: RATE_LIMIT_PER_IP,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Coba lagi nanti." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((ipLimit.retryAfterMs || RATE_LIMIT_WINDOW_MS) / 1000)),
            "X-RateLimit-Limit": String(RATE_LIMIT_PER_IP),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    const supabase = await createClient();

    // Supabase handles password reset email automatically
    // Always return success regardless of whether email exists to prevent
    // account enumeration. Errors are logged server-side for monitoring.
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${getAppUrl()}/auth/reset-password`,
    });

    if (error) {
      console.error("Password reset error:", error);
    }

    return NextResponse.json({
      success: true,
      message: "Jika email terdaftar, link reset akan dikirim",
    });
  } catch (err) {
    console.error("Forgot password API error:", err);
    return NextResponse.json(
      { error: "Gagal mengirim email reset password" },
      { status: 500 }
    );
  }
}
