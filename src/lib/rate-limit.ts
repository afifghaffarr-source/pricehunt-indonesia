import { createAdminClient } from "@/lib/supabase/admin";

type RateLimitInput = {
  identifier: string;
  endpoint: string;
  limit: number;
  windowMs: number;
};

type RateLimitRow = { id: string; count: number };

export async function checkPersistentRateLimit(input: RateLimitInput) {
  const supabase = createAdminClient();
  const windowStart = new Date(Math.floor(Date.now() / input.windowMs) * input.windowMs).toISOString();

  try {
    // Use atomic PostgreSQL function to prevent race conditions
    const { data, error } = await supabase.rpc('increment_rate_limit', {
      p_identifier: input.identifier,
      p_endpoint: input.endpoint,
      p_window_start: windowStart,
      p_limit: input.limit,
    });

    if (error) {
      console.error("Rate limit RPC failed:", error.message);
      // Fail open on DB error (allow request but log)
      return { allowed: true, remaining: input.limit - 1 };
    }

    if (!data || data.length === 0) {
      return { allowed: true, remaining: input.limit - 1 };
    }

    const result = data[0];
    return {
      allowed: result.allowed,
      remaining: result.remaining,
    };
  } catch (err) {
    console.error("Rate limit exception:", err);
    // Fail open on unexpected error
    return { allowed: true, remaining: input.limit - 1 };
  }
}

export function getRequestIdentifier(userId: string | null, request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return userId ? `user:${userId}` : `ip:${forwardedFor || "unknown"}`;
}