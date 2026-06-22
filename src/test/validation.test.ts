/**
 * Unit tests for src/lib/validation.ts — dependency-free request-body
 * schema validator used by /api/admin/* routes.
 */
import { describe, it, expect } from "vitest";
import { z } from "@/lib/validation";

describe("z.string", () => {
  it("accepts a valid string", () => {
    expect(z.string().safeParse("hello")).toEqual({ ok: true, value: "hello" });
  });

  it("rejects non-strings (number, boolean, null, undefined, object)", () => {
    expect(z.string().safeParse(42).ok).toBe(false);
    expect(z.string().safeParse(true).ok).toBe(false);
    expect(z.string().safeParse(null).ok).toBe(false);
    expect(z.string().safeParse(undefined).ok).toBe(false);
    expect(z.string().safeParse({}).ok).toBe(false);
    expect(z.string().safeParse([]).ok).toBe(false);
  });

  it("rejects strings shorter than minLength", () => {
    const r = z.string({ minLength: 3 }).safeParse("ab");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("short");
  });

  it("accepts strings exactly at minLength", () => {
    expect(z.string({ minLength: 3 }).safeParse("abc").ok).toBe(true);
  });

  it("rejects strings longer than maxLength", () => {
    const r = z.string({ maxLength: 5 }).safeParse("too long string");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("long");
  });

  it("accepts strings exactly at maxLength", () => {
    expect(z.string({ maxLength: 5 }).safeParse("exact").ok).toBe(true);
  });

  it("uses default maxLength of 10000", () => {
    const long = "x".repeat(10_001);
    expect(z.string().safeParse(long).ok).toBe(false);
  });
});

describe("z.optionalString", () => {
  it("accepts undefined, null, empty string and returns null", () => {
    expect(z.optionalString().safeParse(undefined)).toEqual({ ok: true, value: null });
    expect(z.optionalString().safeParse(null)).toEqual({ ok: true, value: null });
    expect(z.optionalString().safeParse("")).toEqual({ ok: true, value: null });
  });

  it("validates present strings against the underlying rules", () => {
    expect(z.optionalString({ minLength: 3 }).safeParse("ab").ok).toBe(false);
    expect(z.optionalString({ minLength: 3 }).safeParse("abc").ok).toBe(true);
  });
});

describe("z.number", () => {
  it("accepts a finite number", () => {
    expect(z.number().safeParse(42).ok).toBe(true);
  });

  it("coerces a numeric string", () => {
    expect(z.number().safeParse("3.14").ok).toBe(true);
    const r = z.number().safeParse("3.14");
    expect(r.ok && r.value).toBe(3.14);
  });

  it("rejects non-numeric strings, NaN, Infinity", () => {
    expect(z.number().safeParse("abc").ok).toBe(false);
    expect(z.number().safeParse(NaN).ok).toBe(false);
    expect(z.number().safeParse(Infinity).ok).toBe(false);
    expect(z.number().safeParse(-Infinity).ok).toBe(false);
  });

  it("rejects non-number, non-string types", () => {
    expect(z.number().safeParse(null).ok).toBe(false);
    expect(z.number().safeParse(undefined).ok).toBe(false);
    expect(z.number().safeParse({}).ok).toBe(false);
  });

  it("enforces integer constraint", () => {
    expect(z.number({ integer: true }).safeParse(3.14).ok).toBe(false);
    expect(z.number({ integer: true }).safeParse(3).ok).toBe(true);
    expect(z.number({ integer: true }).safeParse("3").ok).toBe(true);
  });

  it("enforces min and max", () => {
    expect(z.number({ min: 0 }).safeParse(-1).ok).toBe(false);
    expect(z.number({ min: 0 }).safeParse(0).ok).toBe(true);
    expect(z.number({ max: 100 }).safeParse(101).ok).toBe(false);
    expect(z.number({ max: 100 }).safeParse(100).ok).toBe(true);
  });

  it("enforces combined integer + min/max", () => {
    const s = z.number({ integer: true, min: 1, max: 10 });
    expect(s.safeParse(0).ok).toBe(false);
    expect(s.safeParse(11).ok).toBe(false);
    expect(s.safeParse(5).ok).toBe(true);
    expect(s.safeParse(5.5).ok).toBe(false);
  });
});

describe("z.optionalUuid", () => {
  it("accepts null, undefined, empty string and returns null", () => {
    expect(z.optionalUuid().safeParse(undefined)).toEqual({ ok: true, value: null });
    expect(z.optionalUuid().safeParse(null)).toEqual({ ok: true, value: null });
    expect(z.optionalUuid().safeParse("")).toEqual({ ok: true, value: null });
  });

  it("accepts a valid UUID v4 format", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    expect(z.optionalUuid().safeParse(uuid).ok).toBe(true);
  });

  it("rejects malformed UUIDs", () => {
    expect(z.optionalUuid().safeParse("not-a-uuid").ok).toBe(false);
    expect(z.optionalUuid().safeParse("550e8400-e29b-41d4-a716").ok).toBe(false);
    expect(z.optionalUuid().safeParse("550e8400e29b41d4a716446655440000").ok).toBe(false);
    expect(z.optionalUuid().safeParse(123).ok).toBe(false);
  });
});

describe("z.url", () => {
  it("accepts http and https URLs", () => {
    expect(z.url().safeParse("https://example.com").ok).toBe(true);
    expect(z.url().safeParse("http://example.com").ok).toBe(true);
    expect(z.url().safeParse("https://example.com/path?q=1").ok).toBe(true);
  });

  it("rejects non-http(s) protocols", () => {
    expect(z.url().safeParse("ftp://example.com").ok).toBe(false);
    expect(z.url().safeParse("javascript:alert(1)").ok).toBe(false);
    expect(z.url().safeParse("file:///etc/passwd").ok).toBe(false);
  });

  it("rejects invalid URL strings", () => {
    expect(z.url().safeParse("not a url").ok).toBe(false);
    expect(z.url().safeParse("").ok).toBe(false);
    expect(z.url().safeParse(null).ok).toBe(false);
    expect(z.url().safeParse(123).ok).toBe(false);
  });
});

describe("z.object", () => {
  it("parses a valid object against the shape", () => {
    const schema = z.object({
      name: z.string({ minLength: 1 }),
      age: z.number({ integer: true }),
    });
    const r = schema.safeParse({ name: "alice", age: 30 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({ name: "alice", age: 30 });
    }
  });

  it("rejects non-object input", () => {
    const schema = z.object({ name: z.string() });
    expect(schema.safeParse(null).ok).toBe(false);
    expect(schema.safeParse("string").ok).toBe(false);
    expect(schema.safeParse(42).ok).toBe(false);
    expect(schema.safeParse([]).ok).toBe(false);
  });

  it("reports the failing key in the error message", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const r = schema.safeParse({ name: "alice", age: "not-a-number" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toContain("age");
    }
  });

  it("omits keys whose schema returned undefined (skip pattern)", () => {
    // Build a schema where one field's schema returns undefined (not null)
    // to exercise the `value !== undefined` guard in object().
    const optionalUndefined = (): {
      safeParse: (v: unknown) => { ok: true; value: string | undefined };
    } => ({
      safeParse: (v: unknown) => {
        if (v === undefined) return { ok: true, value: undefined };
        if (typeof v === "string") return { ok: true, value: v };
        return { ok: false, message: "bad" } as never;
      },
    });
    const schema = z.object({
      a: z.string(),
      b: optionalUndefined(),
    });
    const r = schema.safeParse({ a: "x", b: undefined });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({ a: "x" });
      expect("b" in r.value).toBe(false);
    }
  });

  it("keeps keys whose value was null (null is a valid present value)", () => {
    const schema = z.object({
      a: z.string(),
      b: z.optionalString(),
    });
    const r = schema.safeParse({ a: "x", b: undefined });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // optionalString coerces undefined → null, so `b: null` is present.
      expect(r.value).toEqual({ a: "x", b: null });
    }
  });

  it("uses the first validation error encountered (does not collect all)", () => {
    const schema = z.object({
      a: z.string(),
      b: z.string(),
      c: z.string(),
    });
    const r = schema.safeParse({ a: 1, b: 2, c: 3 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toContain("a");
      expect(r.message).not.toContain("b");
    }
  });
});