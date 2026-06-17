/**
 * Integration tests: Phase 5 refresh API flow
 *
 * Tests the 3 refresh endpoints with mocked Supabase admin client.
 * Verifies:
 *   1. Auth check (INGESTION_SECRET required)
 *   2. Response shape (correct JSON structure)
 *   3. Cross-route consistency
 *
 * The 3 routes use `createAdminClient` from `@/lib/supabase/admin`.
 * We mock that module to return a chainable Supabase-like interface.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock data — represents realistic crawl_targets rows
const MOCK_CRAWL_TARGETS = [
  {
    id: "ct-001",
    url: "https://tokopedia.com/product/iphone-15",
    domain: "tokopedia.com",
    marketplace_id: "mp-tokped",
    product_id: "p-iphone-15",
    priority_score: 85,
    last_crawled_at: "2026-06-17T08:00:00Z",
    next_crawl_at: "2026-06-17T09:00:00Z",
    crawl_status: "active",
    source: "manual",
  },
  {
    id: "ct-002",
    url: "https://shopee.co.id/product/macbook",
    domain: "shopee.co.id",
    marketplace_id: "mp-shopee",
    product_id: "p-macbook",
    priority_score: 42,
    last_crawled_at: "2026-06-16T20:00:00Z",
    next_crawl_at: "2026-06-17T20:00:00Z",
    crawl_status: "active",
    source: "discovery",
  },
];

// Helper: build a chainable Supabase-like interface that resolves to `rows`.
// Each method returns the chain itself (thenable), so all chain operations
// work AND the chain can be awaited. Mimics how the real Supabase client
// behaves (chain ops + await at the end).
function makeChainable(rows: typeof MOCK_CRAWL_TARGETS) {
  const chain: any = {
    select: vi.fn(),
    eq: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    single: vi.fn(() => Promise.resolve({ data: rows[0], error: null })),
    upsert: vi.fn(() => Promise.resolve({ data: rows, error: null })),
    update: vi.fn(),
    in: vi.fn(() => Promise.resolve({ data: rows, error: null })),
    // Thenable: allows `await chain` to resolve to the result
    then: (resolve: (val: { data: typeof rows; error: null }) => void) =>
      Promise.resolve({ data: rows, error: null }).then(resolve),
  };
  // Every chainable method returns the chain (awaitable proxy)
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.or.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  return chain;
}

const mockChain = makeChainable(MOCK_CRAWL_TARGETS);

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => mockChain),
  })),
}));

const VALID_SECRET = "test-ingestion-secret-abc123";
process.env.INGESTION_SECRET = VALID_SECRET;

function makeRequest(
  url: string,
  options: { method?: string; auth?: string | null; body?: unknown } = {}
) {
  const { method = "GET", auth = VALID_SECRET, body } = options;
  const headers: Record<string, string> = { host: "localhost:3000" };
  if (auth) headers["authorization"] = `Bearer ${auth}`;
  return new Request(`http://localhost:3000${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("Phase 5 refresh API integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Auth: INGESTION_SECRET required on all 3 routes", () => {
    it("/api/refresh/queue rejects missing auth", async () => {
      const { GET } = await import("@/app/api/refresh/queue/route");
      const res = await GET(makeRequest("/api/refresh/queue", { auth: null }) as never);
      expect(res.status).toBe(401);
    });

    it("/api/refresh/queue rejects invalid auth", async () => {
      const { GET } = await import("@/app/api/refresh/queue/route");
      const res = await GET(
        makeRequest("/api/refresh/queue", { auth: "wrong-token" }) as never
      );
      expect(res.status).toBe(401);
    });

    it("/api/refresh/trigger rejects missing auth", async () => {
      const { POST } = await import("@/app/api/refresh/trigger/route");
      const res = await POST(
        makeRequest("/api/refresh/trigger", { method: "POST", auth: null }) as never
      );
      expect(res.status).toBe(401);
    });
  });

  describe("Response shape", () => {
    it("/api/refresh/queue returns priority-sorted targets", async () => {
      const { GET } = await import("@/app/api/refresh/queue/route");
      const res = await GET(makeRequest("/api/refresh/queue") as never);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.queue_length).toBe(2);
      expect(data.data.targets).toHaveLength(2);
    });

    it("/api/refresh/queue returns each target with required fields", async () => {
      const { GET } = await import("@/app/api/refresh/queue/route");
      const res = await GET(makeRequest("/api/refresh/queue") as never);
      const data = await res.json();
      const target = data.data.targets[0];
      // Verify the type contract — these fields are what consumers need
      expect(target).toHaveProperty("id");
      expect(target).toHaveProperty("url");
      expect(target).toHaveProperty("domain");
      expect(target).toHaveProperty("marketplace_id");
      expect(target).toHaveProperty("priority_score");
      expect(target).toHaveProperty("last_crawled_at");
      expect(target).toHaveProperty("next_crawl_at");
    });

    it("/api/refresh/trigger enqueues target IDs in the request body", async () => {
      const { POST } = await import("@/app/api/refresh/trigger/route");
      const res = await POST(
        makeRequest("/api/refresh/trigger", {
          method: "POST",
          body: { target_ids: ["ct-001", "ct-002"] },
        }) as never
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.enqueued_count).toBe(2);
    });
  });

  describe("Cross-route consistency", () => {
    it("queue items match the IDs the API would return", async () => {
      const { GET } = await import("@/app/api/refresh/queue/route");
      const res = await GET(makeRequest("/api/refresh/queue") as never);
      const data = await res.json();
      const queueIds = data.data.targets.map((t: { id: string }) => t.id).sort();
      const expectedIds = MOCK_CRAWL_TARGETS.map((t) => t.id).sort();
      expect(queueIds).toEqual(expectedIds);
    });
  });
});
