/**
 * Unit tests: /api/auth/reset-password
 *
 * Security-critical: token bruteforce + password update flow.
 * Tests:
 * - IP rate limit (10/hour)
 * - Token/password presence validation
 * - Password length validation (>= 6)
 * - Supabase updateUser success/error
 * - Generic vs specific error responses (no enumeration)
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const { mockUpdateUser, mockCheckPersistentRateLimit } = vi.hoisted(() => ({
  mockUpdateUser: vi.fn(),
  mockCheckPersistentRateLimit: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { updateUser: mockUpdateUser },
  })),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkPersistentRateLimit: mockCheckPersistentRateLimit,
}));

import { POST } from "@/app/api/auth/reset-password/route";

function makeRequest(body: unknown, ip = "10.0.0.1") {
  return new Request("http://localhost:3000/api/auth/reset-password", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckPersistentRateLimit.mockResolvedValue({ allowed: true, remaining: 9 });
  });

  it("returns 429 with retry headers when IP rate limited", async () => {
    mockCheckPersistentRateLimit.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      retryAfterMs: 3600000,
    });
    const res = await POST(makeRequest({ token: "abc", password: "newpass123" }) as never);

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("3600");
    expect(res.headers.get("X-RateLimit-Limit")).toBe("10");
    // Should NOT call Supabase when rate-limited
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("returns 400 when token missing", async () => {
    const res = await POST(makeRequest({ password: "newpass123" }) as never);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/token dan password/i);
  });

  it("returns 400 when password missing", async () => {
    const res = await POST(makeRequest({ token: "abc" }) as never);
    expect(res.status).toBe(400);
  });

  it("returns 400 when both missing", async () => {
    const res = await POST(makeRequest({}) as never);
    expect(res.status).toBe(400);
  });

  it("returns 400 when password shorter than 6 characters", async () => {
    const res = await POST(makeRequest({ token: "abc", password: "12345" }) as never);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/minimal 6 karakter/i);
  });

  it("returns 200 with success message when Supabase update succeeds", async () => {
    mockUpdateUser.mockResolvedValue({ error: null });
    const res = await POST(makeRequest({ token: "valid-token", password: "newpass123" }) as never);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toMatch(/berhasil direset/i);
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: "newpass123" });
  });

  it("returns 400 with generic invalid-token message when Supabase rejects", async () => {
    mockUpdateUser.mockResolvedValue({ error: { message: "Token expired" } });
    const res = await POST(makeRequest({ token: "expired", password: "newpass123" }) as never);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/tidak valid atau sudah kadaluarsa/i);
  });

  it("returns 500 on malformed JSON body", async () => {
    const req = new Request("http://localhost:3000/api/auth/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "10.0.0.1" },
      body: "not-valid-json",
    });
    const res = await POST(req as never);
    expect(res.status).toBe(500);
  });
});
