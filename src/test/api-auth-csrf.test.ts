/**
 * Unit tests: /api/auth/csrf
 *
 * Tests the CSRF token issuance endpoint (no auth, no DB).
 * - Returns 64-char hex token
 * - Sets cookie with proper flags
 * - __Host-csrf cookie added for non-localhost HTTPS
 */
import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/auth/csrf/route";

function makeRequest(host = "localhost:3000") {
  // Pass host via both URL and explicit header — jsdom's Request doesn't
  // auto-set the Host header from the URL, so the route's
  // `request.headers.get("host")` would otherwise be empty.
  return new Request(`http://${host}/api/auth/csrf`, {
    method: "GET",
    headers: { host },
  });
}

describe("GET /api/auth/csrf", () => {
  it("returns a 64-char hex token in JSON body", async () => {
    const res = await GET(makeRequest() as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.csrf_token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("issues a unique token on every call (not deterministic)", async () => {
    const a = await (await GET(makeRequest() as never)).json();
    const b = await (await GET(makeRequest() as never)).json();
    expect(a.csrf_token).not.toBe(b.csrf_token);
  });

  it("sets csrf-token cookie on every response", async () => {
    const res = await GET(makeRequest() as never);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("csrf-token=");
    // Non-HttpOnly so client JS can echo it in x-csrf-token header
    expect(setCookie).toMatch(/csrf-token=([0-9a-f]{64})/);
    expect(setCookie).toMatch(/SameSite=Lax/i);
    expect(setCookie).toMatch(/Max-Age=86400/);
  });

  it("does NOT set __Host-csrf cookie for localhost", async () => {
    const res = await GET(makeRequest("localhost:3000") as never);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).not.toContain("__Host-csrf");
  });

  it("does NOT set __Host-csrf cookie for 127.0.0.1", async () => {
    const res = await GET(makeRequest("127.0.0.1:3000") as never);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).not.toContain("__Host-csrf");
  });

  it("uses maxAge of 24 hours (86400 seconds)", async () => {
    const res = await GET(makeRequest() as never);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toMatch(/Max-Age=86400/);
  });
});
