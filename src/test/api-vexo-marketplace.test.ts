/**
 * v1.5.2 — VexoAPI marketplace mock-data guard.
 *
 * VexoAPI's `/api/tools/marketplace` currently returns `_meta.is_mock: true`
 * for all calls. The route must refuse to pass that through to the frontend
 * (which would display fake prices/images). Instead, return 503 with
 * `mockDisabled: true` so callers can fall back gracefully.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Hoisted mocks for the modules the route imports.
const mocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  checkPersistentRateLimit: vi.fn(),
  getRequestIdentifier: vi.fn(),
}));

vi.mock("@/lib/api-auth", () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}));
vi.mock("@/lib/rate-limit", () => ({
  checkPersistentRateLimit: mocks.checkPersistentRateLimit,
  getRequestIdentifier: mocks.getRequestIdentifier,
}));

import { GET } from "@/app/api/vexo/marketplace/route";

const ENV_KEY = "VEXO_API_KEY";
const ENV_BASE = "VEXO_API_BASE_URL";
const TEST_KEY = "test-vexo-key-12345";
const TEST_BASE = "https://vexoapi.test";

const ORIGINAL_KEY = process.env[ENV_KEY];
const ORIGINAL_BASE = process.env[ENV_BASE];

function setKey(value: string | undefined) {
  if (value === undefined) delete process.env[ENV_KEY];
  else process.env[ENV_KEY] = value;
}

beforeEach(() => {
  setKey(TEST_KEY);
  process.env[ENV_BASE] = TEST_BASE;
  mocks.getAuthenticatedUser.mockResolvedValue(null);
  mocks.getRequestIdentifier.mockReturnValue("ip:127.0.0.1");
  mocks.checkPersistentRateLimit.mockResolvedValue({ allowed: true, remaining: 30 });
  vi.restoreAllMocks();
});

afterEach(() => {
  setKey(ORIGINAL_KEY);
  if (ORIGINAL_BASE === undefined) delete process.env[ENV_BASE];
  else process.env[ENV_BASE] = ORIGINAL_BASE;
});

function mockVexoResponse(body: unknown, ok = true, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok,
      status,
      json: async () => body,
    }),
  );
}

function makeRequest(name = "iPhone 15 Pro Max") {
  const url = name
    ? `https://www.bijakbeli.web.id/api/vexo/marketplace?name=${encodeURIComponent(name)}`
    : "https://www.bijakbeli.web.id/api/vexo/marketplace";
  // Use the URL constructor + spread to give the route handler the
  // `nextUrl` getter it expects on NextRequest.
  const req = new Request(url) as unknown as import("next/server").NextRequest;
  Object.defineProperty(req, "nextUrl", {
    get: () => new URL(url),
  });
  return req;
}

describe("VexoAPI marketplace route — v1.5.2 mock guard", () => {
  it("returns 503 with mockDisabled when upstream reports is_mock: true", async () => {
    mockVexoResponse({
      status: 200,
      data: {
        product_name: "iPhone 15 Pro Max",
        current_price: 1000000,
        _meta: { is_mock: true, note: "Mock data for development" },
      },
    });

    const res = await GET(makeRequest() as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.mockDisabled).toBe(true);
    expect(body.data).toBeNull();
  });

  it("does not leak mock product data (name, price, image) in response", async () => {
    mockVexoResponse({
      status: 200,
      data: {
        product_name: "FAKE PRODUCT",
        current_price: 1,
        image_url: "https://fake.example/img.jpg",
        _meta: { is_mock: true },
      },
    });

    const res = await GET(makeRequest() as unknown as import("next/server").NextRequest);
    const body = await res.json();
    expect(body).not.toHaveProperty("product");
    expect(body).not.toHaveProperty("success");
    expect(JSON.stringify(body)).not.toContain("FAKE PRODUCT");
    expect(JSON.stringify(body)).not.toContain("fake.example");
  });

  it("returns 200 with real data when upstream reports is_mock: false", async () => {
    mockVexoResponse({
      status: 200,
      data: {
        product_name: "iPhone 15 Pro Max",
        current_price: 18500000,
        image_url: "https://cdn.example/iphone.jpg",
        _meta: { is_mock: false },
      },
    });

    const res = await GET(makeRequest() as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.product.name).toBe("iPhone 15 Pro Max");
    expect(body.product.currentPrice).toBe(18500000);
    expect(body.isMock).toBe(false);
  });

  it("returns 200 when _meta is missing (defensive: assume real)", async () => {
    // Some VexoAPI responses may not include _meta at all. Treat absence
    // as not-mock (i.e. trust the upstream) — the failure case is when
    // is_mock is explicitly true.
    mockVexoResponse({
      status: 200,
      data: {
        product_name: "iPhone 15 Pro Max",
        current_price: 18500000,
      },
    });

    const res = await GET(makeRequest() as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isMock).toBe(false);
  });

  it("returns 500 when VEXO_API_KEY is empty string", async () => {
    setKey("");
    const res = await GET(makeRequest() as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(500);
  });

  it("returns 400 when neither url nor name is provided", async () => {
    const res = await GET(makeRequest("") as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(400);
  });

  it("returns 502 when upstream returns no data", async () => {
    mockVexoResponse({ status: 200, data: null }, true, 200);
    const res = await GET(makeRequest() as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(502);
  });
});
