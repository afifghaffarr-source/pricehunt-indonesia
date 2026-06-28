/**
 * Tests for /api/extension/current-price
 *
 * Critical because this endpoint gates the extension's price-drop notification
 * feature. If it returns the wrong shape or wrong status code, the
 * chrome.notifications trigger will silently misbehave.
 *
 * We mock `@/lib/supabase/server` so the test doesn't need a live DB.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mutable thenable proxy — every chainable supabase call returns the same
// proxy, so .select().eq().maybeSingle() always lands on the same data shape.
const supabaseProxyState: { result: { data: unknown; error: unknown }; calledFrom: string | null } = {
  result: { data: null, error: null },
  calledFrom: null,
};

function makeThenableProxy() {
  return new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === "then") {
          return (resolve: (v: unknown) => void) =>
            resolve(supabaseProxyState.result);
        }
        // Every method returns a function that yields the same proxy back,
        // enabling any chain like .select().eq().maybeSingle().
        return () => proxy;
      },
    }
  );
}
const proxy = makeThenableProxy();

const fromMock = vi.fn((table: string) => {
  supabaseProxyState.calledFrom = table;
  return proxy;
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: fromMock })),
}));

// Provide a known INGESTION_SECRET so the auth check is deterministic.
let GET: (
  request: import("next/server").NextRequest
) => Promise<Response> | Response;

beforeEach(async () => {
  process.env.INGESTION_SECRET = "test-secret-xyz";
  fromMock.mockClear();
  supabaseProxyState.calledFrom = null;
  supabaseProxyState.result = { data: null, error: null };
});

// Lazy-load route module inside the test body so the mock is registered
// before route.ts evaluates. Pattern matches api-offer-snapshot.test.ts.
async function loadRoute() {
  if (!GET) {
    const mod = await import("@/app/api/extension/current-price/route");
    GET = mod.GET;
  }
  return GET;
}

function makeRequest(urlParam: string | null, auth: string | null = "Bearer test-secret-xyz") {
  // Minimal NextRequest stand-in: only the two props the route uses.
  // Avoids importing `next/server` (vitest cannot resolve next/* types).
  const u = new URL("http://localhost/api/extension/current-price");
  if (urlParam) u.searchParams.set("url", urlParam);
  return {
    headers: {
      get: (k: string) =>
        k.toLowerCase() === "authorization" ? (auth ?? "") : null,
    },
    nextUrl: u,
  } as unknown as import("next/server").NextRequest;
}

async function makeCall(request: unknown) {
  const handler = await loadRoute();
  // Test inputs use either:
  //   (a) makeRequest() — our stand-in with `nextUrl` (URLSearchParams) + `headers.get`
  //   (b) native Request from `new Request(...)` — route must use `new URL(req.url).searchParams`
  // MakeCall normalises both into the route's expected `nextUrl` shape.
  const r = request as { headers: { get(k: string): string | null }; nextUrl?: URL; url?: string };
  const nextUrl =
    r.nextUrl ??
    new URL(
      (r as unknown as { url: string }).url ?? "http://localhost/api/extension/current-price"
    );
  const wrapped = {
    headers: {
      get: (k: string) =>
        (r.headers?.get?.(k) ?? null) ||
        (k.toLowerCase() === "authorization" && r.headers
          ? (r.headers as Record<string, string>)["authorization"] ?? null
          : null),
    },
    nextUrl,
  };
  return handler(wrapped as never);
}

describe("GET /api/extension/current-price", () => {
  describe("auth", () => {
    it("returns 401 when INGESTION_SECRET is not set on server", async () => {
      delete process.env.INGESTION_SECRET;
      const res = await makeCall(makeRequest("https://shopee.co.id/-i/1"));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toEqual({ error: "unauthorized" });
    });

    it("returns 401 when auth header does not match", async () => {
      const res = await makeCall(makeRequest("https://shopee.co.id/-i/1", "Bearer wrong-secret"));
      expect(res.status).toBe(401);
    });

    it("returns 401 when authorization header missing", async () => {
      const res = await makeCall(makeRequest("https://shopee.co.id/-i/1", null));
      expect(res.status).toBe(401);
    });
  });

  describe("input validation", () => {
    it("returns 400 when url query param missing", async () => {
      const res = await makeCall(makeRequest(null));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/missing url/);
    });

    it.each([
      "https://example.com/evil/-i/1",
      "https://google.com/search",
      "http://shopee.co.id.evil.test/-i/1", // subdomain trickery
      "ftp://shopee.co.id/-i/1",
      "not-a-url",
    ])("returns 400 for non-allowed host: %s", async (badUrl) => {
      // Re-create the request with the bad url param directly.
      const u = new URL("http://localhost/api/extension/current-price");
      u.searchParams.set("url", badUrl);
      const req = new Request(u.toString(), {
        method: "GET",
        headers: { authorization: "Bearer test-secret-xyz" },
      });
      const res = await makeCall(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/allowed marketplace/);
    });
  });

  describe("happy path — extension uses this to drive notifications", () => {
    it("returns 200 with full offer data when match found", async () => {
      supabaseProxyState.result = {
        data: {
          url: "https://shopee.co.id/-test-product/123",
          title: "iPhone 15 Pro Max",
          current_price: 18500000,
          updated_at: "2026-06-28T10:00:00Z",
          marketplaces: { name: "shopee" },
        },
        error: null,
      };

      const res = await makeCall(
        makeRequest("https://shopee.co.id/-test-product/123") as never
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({
        url: "https://shopee.co.id/-test-product/123",
        title: "iPhone 15 Pro Max",
        marketplace: "shopee",
        current_price: 18500000,
        updated_at: "2026-06-28T10:00:00Z",
      });
      // Confirms we hit offers (not the broken products.url that prod v1 had).
      expect(supabaseProxyState.calledFrom).toBe("offers");
    });

    it("handles marketplaces join when returned as array (PostgREST cardinality)", async () => {
      supabaseProxyState.result = {
        data: {
          url: "https://www.tokopedia.com/-tokped-test/123",
          title: "Galaxy S24",
          current_price: 12000000,
          updated_at: "2026-06-27T22:00:00Z",
          marketplaces: [{ name: "tokopedia" }],
        },
        error: null,
      };

      const res = await makeCall(
        makeRequest("https://www.tokopedia.com/-tokped-test/123") as never
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.marketplace).toBe("tokopedia");
    });

    it("returns 200 with null fields when no offer matches (extension should NOT retry)", async () => {
      supabaseProxyState.result = { data: null, error: null };
      const res = await makeCall(
        makeRequest("https://www.lazada.co.id/-unknown/999") as never
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({
        url: "https://www.lazada.co.id/-unknown/999",
        title: null,
        marketplace: null,
        current_price: null,
        updated_at: null,
      });
    });

    it("normalizes missing title to null (extension has to deal with null)", async () => {
      supabaseProxyState.result = {
        data: {
          url: "https://www.blibli.com/-blibli-test/1",
          // title omitted
          current_price: 9990000,
          updated_at: "2026-06-26T01:02:03Z",
          marketplaces: null,
        },
        error: null,
      };
      const res = await makeCall(
        makeRequest("https://www.blibli.com/-blibli-test/1") as never
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.title).toBeNull();
      expect(body.marketplace).toBeNull();
      expect(body.current_price).toBe(9990000);
    });

    it("returns 502 when PostgREST errors (extension SHOULD retry)", async () => {
      supabaseProxyState.result = {
        data: null,
        // Supabase errors come back as { message, code, ... } — test only needs message.
        error: { message: "connection terminated" } as unknown,
      };
      const res = await makeCall(
        makeRequest("https://shopee.co.id/-i/1") as never
      );
      expect(res.status).toBe(502);
      const body = await res.json();
      expect(body.error).toBe("connection terminated");
    });
  });

  describe("host allowlist (open-proxy prevention)", () => {
    it.each([
      "https://www.shopee.co.id/-iphone-15-pro-max/123",
      "https://shopee.co.id/-iphone-15-pro-max/123",
      "https://m.shopee.co.id/-iphone-15-pro-max/123",
      "https://seller.shopee.co.id/-iphone-15-pro-max/123",
      "https://www.tokopedia.com/-galaxy-s24/1",
      "https://www.lazada.co.id/-xiaomi-13/9",
      "https://www.blibli.com/-lg-oled/4",
      "https://www.bukalapak.com/-anker/5",
      "https://shop.tiktok.com/-gaming-chair/6",
      "https://www.tokopedia.com/x/2",
      "https://tokopedia.co.id/x/3",
      "https://www.lazada.com/x/4",
      "https://lazada.co.id/x/5",
      "https://www.blibli.co.id/x/6",
      "https://www.bukalapak.co.id/x/7",
      "https://www.tiktok.com/x/8",
      "https://tiktok.co.id/x/9",
    ])("allows %s", async (goodUrl) => {
      supabaseProxyState.result = { data: null, error: null };
      const u = new URL("http://localhost/api/extension/current-price");
      u.searchParams.set("url", goodUrl);
      const req = new Request(u.toString(), {
        method: "GET",
        headers: { authorization: "Bearer test-secret-xyz" },
      });
      const res = await makeCall(req);
      // Either 200 (no match) or 200 (match) — just must NOT be 400.
      expect(res.status).not.toBe(400);
    });
  });

  it("exit code 0 (smoke): no process leaks via unhandled rejection", async () => {
    // Simulate an exception inside the try block.
    supabaseProxyState.result = { data: null, error: null };
    // Replace from() with one that throws.
    fromMock.mockImplementationOnce(() => {
      throw new Error("simulated network failure");
    });
    const res = await makeCall(
      makeRequest("https://shopee.co.id/-i/1") as never
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("simulated network failure");
  });
});
