/**
 * Tests for validation.ts enum_() addition + offerValidateSchema logic.
 *
 * Background: src/lib/validation.ts is a tiny dependency-free zod subset
 * used in /api/admin/* routes (no zod dep in security-critical paths).
 * Adding `z.enum(["a","b","c"])` required a new `enum_` factory — tested
 * here to lock in the behaviour before the new offers/[id]/validate PATCH
 * route relied on it.
 */
import { describe, it, expect } from "vitest";
import { enum_, z } from "@/lib/validation";

describe("validation.enum_() — whitelist validator (added for offer_decision)", () => {
  const ALLOWED = ["valid", "rejected", "conflict", "stale", "pending"] as const;

  it("accepts each allowed literal", () => {
    const s = enum_(ALLOWED);
    for (const v of ALLOWED) {
      const r = s.safeParse(v);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(v);
    }
  });

  it("rejects non-string input", () => {
    const s = enum_(ALLOWED);
    expect(s.safeParse(42).ok).toBe(false);
    expect(s.safeParse(null).ok).toBe(false);
    expect(s.safeParse(undefined).ok).toBe(false);
    expect(s.safeParse({ status: "valid" }).ok).toBe(false);
  });

  it("rejects values outside the whitelist", () => {
    const s = enum_(ALLOWED);
    for (const bad of ["VALID", "approve", "delete", "injected", "p4nd1ng"]) {
      const r = s.safeParse(bad);
      expect(r.ok).toBe(false);
    }
  });

  it("error message names the allowed values", () => {
    const s = enum_(ALLOWED);
    const r = s.safeParse("nope");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      // Must contain at least one allowed value to be debuggable
      expect(r.message).toContain("valid");
      expect(r.message).toContain("rejected");
    }
  });

  it("custom errorMap overrides default message", () => {
    const s = enum_(ALLOWED, { errorMap: () => "Listed only" });
    expect(s.safeParse("nope")).toMatchObject({ ok: false, message: "Listed only" });
  });

  it("not coerced — uppercase VALID is NOT the same as valid", () => {
    const s = enum_(ALLOWED);
    expect(s.safeParse("VALID").ok).toBe(false);
  });
});

describe("z.enum alias works through re-export", () => {
  it("z.enum(['a','b']) is callable via export", () => {
    const s = z.enum(["a", "b"] as const);
    expect(s.safeParse("a")).toMatchObject({ ok: true });
    expect(s.safeParse("c")).toMatchObject({ ok: false });
  });
});

describe("offerValidateSchema-equivalent composition (smoke test)", () => {
  // Mirrors the schema in src/app/api/admin/data-collection/offers/[id]/validate/route.ts
  // to catch regressions in shape inference or default-to-null behaviour.
  it("accepts a valid status with no notes", () => {
    const ALLOWED = ["valid", "rejected", "conflict", "stale", "pending"] as const;
    const schema = z.object({
      status: z.enum(ALLOWED, {
        errorMap: () => `status must be one of ${ALLOWED.join(", ")}`,
      }),
      notes: z.optionalString({ maxLength: 1000 }),
    });
    const r = schema.safeParse({ status: "rejected" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.status).toBe("rejected");
      expect(r.value.notes).toBeNull();
    }
  });

  it("accepts a valid status with notes", () => {
    const schema = z.object({
      status: z.enum(["valid", "rejected", "conflict", "stale", "pending"] as const),
      notes: z.optionalString({ maxLength: 1000 }),
    });
    const r = schema.safeParse({ status: "valid", notes: "OK product" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.notes).toBe("OK product");
  });

  it("rejects an invalid status with descriptive error", () => {
    const schema = z.object({
      status: z.enum(["valid", "rejected"] as const, {
        errorMap: () => "Invalid status",
      }),
      notes: z.optionalString({ maxLength: 1000 }),
    });
    const r = schema.safeParse({ status: "approved", notes: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("status:");
  });

  it("rejects non-JSON-shape input", () => {
    const schema = z.object({
      status: z.enum(["valid", "rejected"] as const),
      notes: z.optionalString({ maxLength: 1000 }),
    });
    for (const bad of [null, "valid", 42, []]) {
      expect(schema.safeParse(bad).ok).toBe(false);
    }
  });
});
