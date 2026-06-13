import { createAdminClient } from "@/lib/supabase/admin";

type RateLimitInput = {
  identifier: string;
  endpoint: string;
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
};

export async function checkPersistentRateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  const supabase = createAdminClient();
  const windowStart = new Date(Math.floor(Date.now() / input.windowMs) * input.windowMs).toISOString();

  try {
    // Use atomic PostgreSQL function to prevent race conditions
    const { data, error } = await supabase.rpc('increment_rate_limit', {
      p_identifier: input.identifier,
      p_endpoint: input.endpoint,
      p_window_start: windowStart,
      p_limit: input.limit,
    } as any) as { data: Array<{ current_count: number; allowed: boolean; remaining: number }> | null; error: any };

    if (error) {
      console.error("Rate limit RPC failed:", error.message);
      // SECURITY: Fail CLOSED on DB error (deny request)
      // This prevents DDoS when database is down
      return { 
        allowed: false, 
        remaining: 0,
        retryAfterMs: input.windowMs // Retry after full window
      };
    }

    if (!data || data.length === 0) {
      // No data returned = first request in window
      return { allowed: true, remaining: input.limit - 1 };
    }

    const result = data[0];
    return {
      allowed: result.allowed,
      remaining: result.remaining,
      retryAfterMs: result.allowed ? undefined : input.windowMs
    };
  } catch (err) {
    console.error("Rate limit exception:", err);
    // SECURITY: Fail CLOSED on unexpected error
    return { 
      allowed: false, 
      remaining: 0,
      retryAfterMs: input.windowMs
    };
  }
}

export function getRequestIdentifier(userId: string | null, request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip");
  const ip = forwardedFor || realIp || "unknown";
  
  return userId ? `user:${userId}` : `ip:${ip}`;
}

/**
 * Helper to create rate limit response with proper headers
 */
export function createRateLimitResponse(
  message: string, 
  retryAfterMs: number = 60000
) {
  const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
  
  return new Response(
    JSON.stringify({ 
      error: message,
      retryAfter: retryAfterSeconds
    }),
    { 
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSeconds),
        'X-RateLimit-Limit': '0',
        'X-RateLimit-Remaining': '0',
      }
    }
  );
}
