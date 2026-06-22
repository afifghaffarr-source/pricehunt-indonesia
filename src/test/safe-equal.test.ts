/**
 * Unit tests for `safeEqual` constant-time string comparison.
 *
 * Critical security helper — used by every ingestion + refresh route to
 * compare the bearer token against INGESTION_SECRET. If the comparison
 * were non-constant-time, an attacker could recover the secret byte by
 * byte via timing analysis.
 *
 * Audit 2026-06-22: this helper was promoted from a private copy inside
 * `src/proxy.ts` to an exported `src/lib/env.ts` function so all
 * ingestion routes can share it.
 */
import { describe, it, expect } from "vitest";
import { safeEqual } from "@/lib/env";

describe("safeEqual", () => {
  it("returns true for identical strings", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("", "")).toBe(true);
    expect(
      safeEqual(
        "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
        "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
      ),
    ).toBe(true);
  });

  it("returns false for different strings of the same length", () => {
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("hello", "world")).toBe(false);
    expect(
      safeEqual(
        "0000000000000000000000000000000000000000000000000000000000000000",
        "0000000000000000000000000000000000000000000000000000000000000001",
      ),
    ).toBe(false);
  });

  it("returns false for strings of different length", () => {
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("", "a")).toBe(false);
    expect(safeEqual("a", "")).toBe(false);
  });

  it("handles hex strings of typical INGESTION_SECRET length (64 chars)", () => {
    // This is the format produced by `crypto.randomBytes(32).toString("hex")`.
    const a = "8f38f6acaafb1d3f5dc0e2f60f07e7e731ca67c4ed15b9dee7ff8094ec9eebc0";
    const b = "8f38f6acaafb1d3f5dc0e2f60f07e7e731ca67c4ed15b9dee7ff8094ec9eebc1";
    expect(safeEqual(a, a)).toBe(true);
    expect(safeEqual(a, b)).toBe(false);
  });

  it("is symmetric (safeEqual(a, b) === safeEqual(b, a))", () => {
    expect(safeEqual("abc", "abd")).toBe(safeEqual("abd", "abc"));
    expect(safeEqual("hello", "world")).toBe(safeEqual("world", "hello"));
  });

  it("never throws on unicode or control characters", () => {
    expect(() => safeEqual("a", "ä")).not.toThrow();
    expect(() => safeEqual("\n", "\t")).not.toThrow();
    expect(safeEqual("a", "ä")).toBe(false);
  });
});