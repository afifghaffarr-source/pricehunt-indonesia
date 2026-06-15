import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkPersistentRateLimit } from "@/lib/rate-limit";

/**
 * Rate limit: 10 attempts per IP per hour.
 * The Supabase recovery token itself is single-use and short-lived,
 * but this prevents bruteforce probing of expired/reused tokens.
 */
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_PER_IP = 10;

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const ipLimit = await checkPersistentRateLimit({
      identifier: `ip:${ip}`,
      endpoint: "auth/reset-password",
      limit: RATE_LIMIT_PER_IP,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan. Coba lagi nanti." },
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

    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token dan password diperlukan" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password minimal 6 karakter" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // The token is automatically validated by Supabase
    // updateUser will use the session from the token
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      console.error("Reset password error:", error);
      return NextResponse.json(
        { error: "Token tidak valid atau sudah kadaluarsa" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Password berhasil direset",
    });
  } catch (err) {
    console.error("Reset password API error:", err);
    return NextResponse.json(
      { error: "Gagal reset password" },
      { status: 500 }
    );
  }
}
