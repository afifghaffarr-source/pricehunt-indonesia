/**
 * Centralised environment-variable helpers.
 *
 * **Server-only.** Importing from a client component is a build error in
 * Next.js 16 (the helper imports nothing browser-safe; the values it returns
 * are server-only secrets). If you need a public env var, use the raw
 * `process.env.NEXT_PUBLIC_*` read at the call site or import `getAppUrl()`
 * from `@/lib/app-url`.
 *
 * Design goals:
 *   1. Single source of truth for the cross-cutting secrets that used to be
 *      re-read with `process.env.X` from 3-7 different routes.
 *   2. Defaults baked in once (no more `|| "https://vexoapi.dev"` scattered
 *      across three routes).
 *   3. Clear, early errors when a required secret is missing.
 *   4. Backwards-compatible with the existing test pattern of mutating
 *      `process.env.X` — helpers read `process.env` lazily on each call, so
 *      tests that swap `process.env.INGESTION_SECRET = "..."` still work.
 *
 * For env vars accessed in exactly one place (e.g. `OPENAI_API_KEY` in
 * `ai-advisor/route.ts`, `RESEND_API_KEY` in `email.ts`), keep the direct
 * `process.env.X` read at the call site — refactoring would add indirection
 * without removing duplication.
 *
 * NOT covered here (kept as direct `process.env` reads because they are
 * either framework-provided, build-only, or single-use):
 *   - `NODE_ENV` — set by Next.js
 *   - `VERCEL_URL` — injected by Vercel runtime (used in `src/lib/app-url.ts`)
 *   - `NEXT_PUBLIC_*` — read at call site; safe in client + server bundles
 *   - `SENTRY_DSN` / `SENTRY_ORG` / `SENTRY_PROJECT` — build-time only
 *   - `OPENAI_API_KEY`, `RESEND_API_KEY`, `EXTERNAL_API_KEY` — single-use per route
 */

/**
 * Read the ingestion API shared secret.
 *
 * Returns `null` when not configured. Callers SHOULD treat that as
 * "server misconfiguration" and return 401 — this matches the existing
 * pattern in every `/api/ingestion/*` and `/api/refresh/*` route (which
 * log + reject rather than crashing the request with an uncaught throw).
 *
 * Used by `/api/ingestion/*`, `/api/refresh/*`, `/api/internal/vexo-search`,
 * and `src/proxy.ts`.
 */
/**
 * Constant-time string comparison (length-tolerant via early bail).
 *
 * **Why this matters:** plain `===` on secret strings leaks information
 * via timing. An attacker can recover a bearer token byte-by-byte by
 * measuring how long the comparison takes (each first-mismatch position
 * exits early in `===`). The XOR-OR loop below takes the same time
 * regardless of where the strings diverge, so timing tells the attacker
 * nothing.
 *
 * **Length-bail caveat:** we still bail if the lengths differ — that's
 * a one-bit signal (the attacker learns the secret length). For our use
 * case (fixed-length hex tokens generated from 32 random bytes), the
 * length is known publicly (always 64 chars), so leaking it costs
 * nothing. For variable-length secrets, add a length-padding step
 * before the loop.
 *
 * Used by `/api/ingestion/*` and `/api/refresh/*` — the proxy uses
 * its own copy (kept inline so it doesn't import this module from the
 * Edge bundle).
 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function getIngestionSecret(): string | null {
  return process.env.INGESTION_SECRET ?? null;
}

/**
 * Read the cron API shared secret.
 *
 * Returns `null` if not configured (the proxy then treats cron routes as
 * unauthenticated, which is intentional for local-dev graceful degradation).
 * For production, `CRON_SECRET` MUST be set — Vercel Cron sends
 * `Authorization: Bearer ${CRON_SECRET}` automatically.
 */
export function getCronSecret(): string | null {
  return process.env.CRON_SECRET ?? null;
}

export interface VexoConfig {
  /** Base URL of the VexoAPI server. Defaults to `https://vexoapi.dev`. */
  baseUrl: string;
  /** VIP API key. Empty string when not configured (Vexo features disabled). */
  apiKey: string;
  /** Request timeout in milliseconds. Defaults to 10_000. */
  timeoutMs: number;
  /** Cache TTL in seconds for Vexo-sourced data. Defaults to 3600. */
  cacheTtlSeconds: number;
}

function parsePositiveInt(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    // Don't throw — log and fall back. Operators occasionally set these to
    // empty/garbage values; we'd rather serve with the default than 500.
    console.warn(
      `[env] ${name}=${JSON.stringify(value)} is not a positive integer; using default ${fallback}.`,
    );
    return fallback;
  }
  return parsed;
}

/**
 * Read the VexoAPI client config.
 *
 * Used by `/api/vexo/*` and `/api/internal/vexo-search`. `apiKey` may be
 * empty (caller should check `isVexoConfigured()` before making calls).
 */
export function getVexoConfig(): VexoConfig {
  return {
    baseUrl: process.env.VEXO_API_BASE_URL?.trim() || "https://vexoapi.dev",
    apiKey: process.env.VEXO_API_KEY ?? "",
    timeoutMs: parsePositiveInt(
      process.env.VEXO_API_TIMEOUT_MS,
      10_000,
      "VEXO_API_TIMEOUT_MS",
    ),
    cacheTtlSeconds: parsePositiveInt(
      process.env.VEXO_CACHE_TTL_SECONDS,
      3600,
      "VEXO_CACHE_TTL_SECONDS",
    ),
  };
}

export interface VapidConfig {
  /** Public key — safe to ship to the browser via `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. */
  publicKey: string;
  /** Private key — server-only, used to sign push messages. */
  privateKey: string;
  /** Contact subject, typically `mailto:admin@yourdomain.tld`. */
  subject: string;
}

/**
 * Read the VAPID (Web Push) config.
 *
 * Returns `null` when either key is missing — push-notification callers
 * should treat that as "feature unavailable, skip silently". The browser-
 * safe public key is also exposed as `NEXT_PUBLIC_VAPID_PUBLIC_KEY`; the
 * server reads `VAPID_PRIVATE_KEY` + `VAPID_SUBJECT` for signing.
 */
export function getVapidConfig(): VapidConfig | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:admin@bijakbeli.id";
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

/**
 * Read the `ENABLE_PRICE_SIMULATION` flag.
 *
 * SECURITY: this MUST be `false` in production. When `true`, the
 * `/api/cron/prices` and `/api/scrape` endpoints overwrite real prices
 * with random simulation values — useful for dev/testing, destructive in
 * prod. Returns `false` if unset.
 */
export function isPriceSimulationEnabled(): boolean {
  return process.env.ENABLE_PRICE_SIMULATION === "true";
}