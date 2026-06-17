/**
 * Unit tests: /api/auth/forgot-password
 *
 * Security-critical surface. Tests:
 * - Input validation (missing/non-string email)
 * - Dual-tier rate limit (per-email, per-IP)
 * - Generic response (no account enumeration)
 * - Server error handling
 *
 * Pattern: vi.hoisted for mock instances, vi.mock for module replacement.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const { mockResetPasswordForEmail, mockCheckPersistentRateLimit } = vi.hoisted(() => ({
  mockResetPasswordForEmail: vi.fn(),
  mockCheckPersistentRateLimit: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { resetPasswordForEmail: mockResetPasswordForEmail },
  })),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkPersistentRateLimit: mockCheckPersistentRateLimit,
}));

import { POST } from "@/app/api/auth/forgot-password/route";

function makeRequest(body: unknown, ip = "10.0.0.1") {
  return new Request("http://localhost:3000/api/auth/forgot-password", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: both rate limits allow
    mockCheckPersistentRateLimit.mockResolvedValue({ allowed: true, remaining: 2 });
  });

  it("returns 400 when email is missing", async () => {
    const res = await POST(makeRequest({}) as never);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/email/i);
  });

  it("returns 400 when email is not a string", async () => {
    const res = await POST(makeRequest({ email: 12345 }) as never);
    expect(res.status).toBe(400);
  });

  it("normalizes email to lowercase + trim", async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null });
    await POST(makeRequest({ email: "  User@Example.COM  " }) as never);

    expect(mockCheckPersistentRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: "email:user@example.com" })
    );
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
      "user@example.com",
      expect.any(Object)
    );
  });

  it("returns generic success when email rate limit exceeded (no enumeration leak)", async () => {
    mockCheckPersistentRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0 });
    const res = await POST(makeRequest({ email: "victim@example.com" }) as never);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toMatch(/jika email terdaftar/i);
    // Supabase should NOT be called when email rate-limited
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("returns 429 with retry headers when IP rate limit exceeded", async () => {
    // First call (per-email) allows, second call (per-IP) denies
    mockCheckPersistentRateLimit
      .mockResolvedValueOnce({ allowed: true, remaining: 2 })
      .mockResolvedValueOnce({ allowed: false, remaining: 0, retryAfterMs: 3600000 });
    const res = await POST(makeRequest({ email: "user@example.com" }) as never);

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("3600");
    expect(res.headers.get("X-RateLimit-Limit")).toBe("20");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
  });

  it("returns generic success when Supabase succeeds (no enumeration)", async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null });
    const res = await POST(makeRequest({ email: "user@example.com" }) as never);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toMatch(/jika email terdaftar/i);
  });

  it("returns generic success even when Supabase errors (no enumeration)", async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: { message: "User not found" } });
    const res = await POST(makeRequest({ email: "nobody@example.com" }) as never);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    // Same generic message regardless of Supabase error
    expect(data.message).toMatch(/jika email terdaftar/i);
  });

  it("returns 500 on malformed JSON body", async () => {
    const req = new Request("http://localhost:3000/api/auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "10.0.0.1" },
      body: "not-valid-json",
    });
    const res = await POST(req as never);
    expect(res.status).toBe(500);
  });
});
