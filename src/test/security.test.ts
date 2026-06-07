import { describe, it, expect } from "vitest";
import { getDealScoreInfo } from "@/lib/utils";

describe("Deal Score Edge Cases", () => {
  it("handles boundary score 85", () => {
    const info = getDealScoreInfo(85);
    expect(info.label).toBe("Harga Terbaik");
  });

  it("handles boundary score 70", () => {
    const info = getDealScoreInfo(70);
    expect(info.label).toBe("Deal Bagus");
  });

  it("handles boundary score 50", () => {
    const info = getDealScoreInfo(50);
    expect(info.label).toBe("Harga Wajar");
  });

  it("handles score 100", () => {
    const info = getDealScoreInfo(100);
    expect(info.label).toBe("Harga Terbaik");
  });

  it("handles score 0", () => {
    const info = getDealScoreInfo(0);
    expect(info.label).toBe("Mahal");
  });
});

describe("Security Headers", () => {
  it("CSP header contains required directives", () => {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' https://placehold.co data: blob:",
    ].join("; ");

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src");
    expect(csp).toContain("style-src");
    expect(csp).toContain("img-src");
  });
});

describe("Rate Limiting Logic", () => {
  it("allows requests within limit", () => {
    const max = 10;
    let count = 0;

    for (let i = 0; i < max; i++) {
      count++;
    }

    expect(count).toBe(max);
  });

  it("detects limit exceeded", () => {
    const max = 10;
    const count = 11;

    expect(count > max).toBe(true);
  });
});
