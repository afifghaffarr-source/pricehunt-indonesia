/**
 * Unit tests: /api/auth/session
 *
 * Lightweight session endpoint used by client components for UI gating.
 * - Returns null user when not signed in
 * - Returns user + is_admin flag when signed in
 * - Returns user without admin flag on profile fetch error (non-fatal)
 * - Returns null user on unexpected exception
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

import { GET } from "@/app/api/auth/session/route";

function setupProfileMock(isAdmin: boolean | null, error: unknown = null) {
  // From chain: .from(table).select(cols).eq(col, val).maybeSingle()
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: isAdmin === null ? null : { is_admin: isAdmin }, error }),
      }),
    }),
  });
}

describe("GET /api/auth/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns user: null when not signed in", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user).toBeNull();
    // No profile query when no user
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns user with is_admin=true when admin", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "admin@example.com" } },
    });
    setupProfileMock(true);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user).toEqual({
      id: "user-1",
      email: "admin@example.com",
      is_admin: true,
    });
  });

  it("returns user with is_admin=false when non-admin", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-2", email: "user@example.com" } },
    });
    setupProfileMock(false);

    const res = await GET();
    const data = await res.json();
    expect(data.user.is_admin).toBe(false);
  });

  it("returns user with is_admin=false when profile row missing (maybeSingle null)", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-3", email: "orphan@example.com" } },
    });
    setupProfileMock(null);

    const res = await GET();
    const data = await res.json();
    expect(data.user.is_admin).toBe(false);
  });

  it("returns user without admin flag on profile fetch error (non-fatal)", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-4", email: "x@example.com" } },
    });
    setupProfileMock(null, { message: "DB connection failed" });

    const res = await GET();
    const data = await res.json();
    expect(data.user.id).toBe("user-4");
    expect(data.user.is_admin).toBe(false);
  });

  it("coerces truthy non-boolean profile.is_admin to true (Boolean wrap)", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-5", email: "y@example.com" } },
    });
    // Some DBs return integer 1 instead of boolean true
    setupProfileMock(1 as unknown as boolean);

    const res = await GET();
    const data = await res.json();
    expect(data.user.is_admin).toBe(true);
  });

  it("returns user: null on unexpected exception", async () => {
    mockGetUser.mockRejectedValue(new Error("Network down"));
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user).toBeNull();
  });
});
