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

  const { data: existing, error: readError } = await supabase
    .from("api_rate_limits")
    .select("id, count")
    .eq("identifier", input.identifier)
    .eq("endpoint", input.endpoint)
    .eq("window_start", windowStart)
    .maybeSingle();

  if (readError) {
    console.error("Rate limit read failed:", readError.message);
    return { allowed: true, remaining: input.limit - 1 };
  }

  if (!existing) {
    await supabase.from("api_rate_limits").insert({
      identifier: input.identifier,
      endpoint: input.endpoint,
      count: 1,
      window_start: windowStart,
    } as never);
    return { allowed: true, remaining: input.limit - 1 };
  }

  const row = existing as RateLimitRow;
  const currentCount = Number(row.count || 0);
  if (currentCount >= input.limit) {
    return { allowed: false, remaining: 0 };
  }

  await supabase
    .from("api_rate_limits")
    .update({ count: currentCount + 1, updated_at: new Date().toISOString() } as never)
    .eq("id", row.id);

  return { allowed: true, remaining: Math.max(0, input.limit - currentCount - 1) };
}

export function getRequestIdentifier(userId: string | null, request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return userId ? `user:${userId}` : `ip:${forwardedFor || "unknown"}`;
}