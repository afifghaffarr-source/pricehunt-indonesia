/**
 * Tiny dependency-free request-body validation helpers.
 *
 * Why not zod / yup / etc.?
 * We want to keep the dependency surface small for this security fix.
 * These helpers cover what we need right now (whitelisted object payloads
 * for /api/admin/* routes). If validation requirements grow, this file is
 * the single place to swap in a schema library.
 */

export type ValidationIssue = { path: string; message: string };

export type SafeParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

export interface Schema<T> {
  safeParse: (value: unknown) => SafeParseResult<T>;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export const string = (opts: { minLength?: number; maxLength?: number } = {}): Schema<string> => ({
  safeParse: (value: unknown): SafeParseResult<string> => {
    if (typeof value !== "string") return { ok: false, message: "Invalid string" };
    if (value.length < (opts.minLength ?? 0)) return { ok: false, message: "String too short" };
    if (value.length > (opts.maxLength ?? 10_000)) return { ok: false, message: "String too long" };
    return { ok: true, value };
  },
});

export const optionalString = (opts: { minLength?: number; maxLength?: number } = {}): Schema<string | null> => ({
  safeParse: (value: unknown): SafeParseResult<string | null> => {
    if (value === undefined || value === null || value === "") {
      return { ok: true, value: null };
    }
    return string(opts).safeParse(value);
  },
});

export const number = (opts: { min?: number; max?: number; integer?: boolean } = {}): Schema<number> => ({
  safeParse: (value: unknown): SafeParseResult<number> => {
    const n = typeof value === "string" ? Number(value) : value;
    if (typeof n !== "number" || !Number.isFinite(n)) return { ok: false, message: "Invalid number" };
    if (opts.integer && !Number.isInteger(n)) return { ok: false, message: "Number must be an integer" };
    if (opts.min !== undefined && n < opts.min) return { ok: false, message: `Number must be >= ${opts.min}` };
    if (opts.max !== undefined && n > opts.max) return { ok: false, message: `Number must be <= ${opts.max}` };
    return { ok: true, value: n };
  },
});

export const optionalUuid = (): Schema<string | null> => ({
  safeParse: (value: unknown): SafeParseResult<string | null> => {
    if (value === undefined || value === null || value === "") {
      return { ok: true, value: null };
    }
    if (
      typeof value !== "string" ||
      !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value)
    ) {
      return { ok: false, message: "Invalid UUID" };
    }
    return { ok: true, value };
  },
});

export const url = (): Schema<string> => ({
  safeParse: (value: unknown): SafeParseResult<string> => {
    if (typeof value !== "string") return { ok: false, message: "Invalid URL" };
    try {
      const u = new URL(value);
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        return { ok: false, message: "URL must be http or https" };
      }
      return { ok: true, value };
    } catch {
      return { ok: false, message: "Invalid URL" };
    }
  },
});

type Shape = Record<string, Schema<unknown>>;
type ShapeOutput<S extends Shape> = { [K in keyof S]: S[K] extends Schema<infer V> ? V : never };

export function object<S extends Shape>(shape: S): Schema<ShapeOutput<S>> {
  return {
    safeParse(input: unknown): SafeParseResult<ShapeOutput<S>> {
      if (!isObject(input)) {
        return { ok: false, message: "Expected object" };
      }
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(shape)) {
        const r = shape[key].safeParse(input[key]);
        if (!r.ok) {
          return { ok: false, message: `${key}: ${r.message}` };
        }
        if ((r as { value: unknown }).value !== undefined) {
          out[key] = (r as { value: unknown }).value;
        }
      }
      return { ok: true, value: out as ShapeOutput<S> };
    },
  };
}

// Re-export a thin "z" so call sites use a familiar shape
// (`z.object({...})`, `z.string({...})`, ...).
export const z = { object, string, optionalString, number, optionalUuid, url };
