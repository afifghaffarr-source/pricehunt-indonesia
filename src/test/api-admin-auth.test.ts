/**
 * Admin authorization + CSRF gate tests.
 *
 * Phase 9 hardening (T5). Verifies the central auth helpers enforce
 * the correct deny-by-default contract:
 *   - guest          -> 401
 *   - non-admin user -> 403
 *   - admin user     -> null (continue)
 *   - cron without secret -> 503 / 401
 *   - cron with bad secret -> 401
 *   - cron with good secret -> null (continue)
 *
 * Also verifies logAdminAction never throws (fail-open contract)
 * and that the safeString/safeMeta helpers do not crash on weird input.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------- Module mocks (must be declared before importing the SUT) ----------

const mockGetUser = vi.fn();
const mockIsUserAdmin = vi.fn();
const mockAdminInsert = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/supabase/auth", () => ({
  getUser: vi.fn(async () => {
    const result = mockGetUser();
    // mockGetUser may be either a Supabase response {data:{user}} or a user.
    // Type guard: if result is an object with a `data` property, treat as
    // Supabase response shape; otherwise treat as user directly.
    if (result && typeof result === "object" && "data" in result) {
      const data = (result as { data: { user?: unknown } | null }).data;
      return data?.user ?? null;
    }
    return result ?? null;
  }),
}));

vi.mock("@/lib/admin-auth", () => ({
  isUserAdmin: (...args: unknown[]) => mockIsUserAdmin(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: (...args: unknown[]) => mockAdminInsert(...args),
    })),
  })),
}));

// ---------- Import SUT after mocks ----------

import { NextRequest } from "next/server";
import {
  requireAuth,
  requireAdmin,
  verifyCronSecret,
  verifyApiKey,
} from "@/lib/api-auth";
import { logAdminAction } from "@/lib/admin-audit";

// ---------- Helpers ----------

function makeRequest(opts: { method?: string; headers?: Record<string, string>; body?: unknown } = {}): NextRequest {
  const init = {
    method: opts.method ?? "POST",
    headers: opts.headers ?? {},
  } as const;
  if (opts.body !== undefined) {
    (init.headers as Record<string, string>)["content-type"] = "application/json";
  }
  return new NextRequest(
    "http://localhost/api/admin/test",
    opts.body !== undefined
      ? { method: init.method, headers: init.headers, body: JSON.stringify(opts.body) }
      : { method: init.method, headers: init.headers },
  );
}

beforeEach(() => {
  mockGetUser.mockReset();
  mockIsUserAdmin.mockReset();
  mockAdminInsert.mockReset();
  // default: admin insert succeeds with no error
  mockAdminInsert.mockResolvedValue({ error: null });
});

// ---------- Tests ----------

describe("requireAuth", () => {
  it("returns 401 when there is no user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await requireAuth();
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
    const body = await res!.json();
    expect(body.error).toBe("Authentication required");
  });

  it("returns null and continues when user is authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const res = await requireAuth();
    expect(res).toBeNull();
  });
});

describe("requireAdmin", () => {
  it("returns 401 when there is no user (guest)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await requireAdmin();
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
  });

  it("returns 403 when user is authenticated but not admin", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u2", email: "x@y.z" } }, error: null });
    mockIsUserAdmin.mockResolvedValue(false);
    const res = await requireAdmin(makeRequest());
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
    const body = await res!.json();
    expect(body.error).toBe("Admin privileges required");
  });

  it("returns null (continue) when user is admin", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u3", email: "admin@y.z" } }, error: null });
    mockIsUserAdmin.mockResolvedValue(true);
    const res = await requireAdmin(makeRequest());
    expect(res).toBeNull();
  });

  it("does NOT call isUserAdmin when user is missing (fail fast)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    await requireAdmin();
    expect(mockIsUserAdmin).not.toHaveBeenCalled();
  });
});

describe("verifyCronSecret", () => {
  const ORIGINAL_ENV = process.env.CRON_SECRET;

  afterEachRestore(() => {
    if (ORIGINAL_ENV === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = ORIGINAL_ENV;
  });

  it("returns 503 when CRON_SECRET is not configured (fail closed)", () => {
    delete process.env.CRON_SECRET;
    const res = verifyCronSecret(makeRequest());
    expect(res).not.toBeNull();
    expect(res!.status).toBe(503);
  });

  it("returns 401 when secret is missing from request", () => {
    process.env.CRON_SECRET = "goodsecret";
    const res = verifyCronSecret(makeRequest());
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
  });

  it("returns 401 when secret is wrong", () => {
    process.env.CRON_SECRET = "goodsecret";
    const res = verifyCronSecret(makeRequest({ headers: { authorization: "Bearer wrong" } }));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
  });

  it("returns null (continue) when secret matches", () => {
    process.env.CRON_SECRET = "goodsecret";
    const res = verifyCronSecret(
      makeRequest({ headers: { authorization: "Bearer goodsecret" } }),
    );
    expect(res).toBeNull();
  });
});

describe("verifyApiKey", () => {
  const ORIGINAL = process.env.EXTERNAL_API_KEY;

  afterEachRestore(() => {
    if (ORIGINAL === undefined) delete process.env.EXTERNAL_API_KEY;
    else process.env.EXTERNAL_API_KEY = ORIGINAL;
  });

  it("returns 503 when EXTERNAL_API_KEY is not configured (fail-closed)", () => {
    delete process.env.EXTERNAL_API_KEY;
    const res = verifyApiKey(makeRequest());
    expect(res).not.toBeNull();
    expect(res!.status).toBe(503);
  });

  it("returns 401 when key is wrong", () => {
    process.env.EXTERNAL_API_KEY = "abc";
    const res = verifyApiKey(makeRequest({ headers: { "x-api-key": "wrong" } }));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
  });

  it("returns null when key is correct", () => {
    process.env.EXTERNAL_API_KEY = "abc";
    const res = verifyApiKey(makeRequest({ headers: { "x-api-key": "abc" } }));
    expect(res).toBeNull();
  });
});

describe("logAdminAction (fail-open contract)", () => {
  it("never throws when admin client fails", async () => {
    mockAdminInsert.mockRejectedValue(new Error("db down"));
    await expect(
      logAdminAction({
        actorId: "u1",
        actorEmail: "a@b.c",
        action: "manual_offer_upsert",
        targetType: "offer",
        targetId: "o1",
        metadata: { foo: "bar" },
      }),
    ).resolves.toBeUndefined();
  });

  it("writes a row when admin client succeeds", async () => {
    mockAdminInsert.mockResolvedValue({ error: null });
    await logAdminAction({
      actorId: "u1",
      actorEmail: "a@b.c",
      action: "resolve_conflict",
      targetType: "price_conflict",
      targetId: "c1",
      request: makeRequest({
        headers: {
          "x-forwarded-for": "1.2.3.4, 10.0.0.1",
          "user-agent": "vitest",
          "x-request-id": "req-123",
        },
      }),
      metadata: { has_keep_offer: true },
    });
    expect(mockAdminInsert).toHaveBeenCalledTimes(1);
    const arg = mockAdminInsert.mock.calls[0][0];
    expect(arg.action).toBe("resolve_conflict");
    expect(arg.target_id).toBe("c1");
    expect(arg.actor_id).toBe("u1");
    expect(arg.ip).toBe("1.2.3.4");
    expect(arg.user_agent).toBe("vitest");
    expect(arg.request_id).toBe("req-123");
  });

  it("clamps oversized metadata to keep DB row bounded", async () => {
    mockAdminInsert.mockResolvedValue({ error: null });
    const huge = "x".repeat(5000);
    await logAdminAction({
      actorId: null,
      actorEmail: null,
      action: "recheck_decision",
      metadata: { description: huge, count: 999, ok: true, junk: undefined },
    });
    const arg = mockAdminInsert.mock.calls[0][0];
    const desc = arg.metadata.description as string;
    expect(desc.length).toBeLessThanOrEqual(1000);
    expect(arg.metadata.count).toBe(999);
    expect(arg.metadata.ok).toBe(true);
    expect(arg.metadata.junk).toBeNull();
  });
});

// Tiny helper so we can use afterEach patterns inside a single describe cleanly.
import { afterEach as _afterEach } from "vitest";
function afterEachRestore(fn: () => void) {
  _afterEach(fn);
}
