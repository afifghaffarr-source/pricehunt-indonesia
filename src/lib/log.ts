/**
 * src/lib/log.ts
 *
 * Structured logger. Outputs single-line JSON so log drains
 * (Vercel, Datadog, Logflare, Better Stack, etc.) can parse and
 * index.
 *
 * Phase 9 hardening (T10).
 *
 * Why a dedicated logger:
 *   - console.log on Vercel surfaces a `msg` field; consumers want
 *     structured fields.
 *   - Audit-log failures must be searchable: a structured event
 *     `audit_log_write_failed` with severity `error` is the contract
 *     the on-call runbook relies on.
 *   - Avoids leaking PII: helpers clamp and redaction-pass the
 *     metadata blob before serializing.
 *
 * Public surface:
 *   logEvent({ level, event, ...fields })
 *   logError(event, err, fields?)   — includes `error.message` and
 *                                    a stable `code`.
 *   logAuditFailure({ action, target_id, error }) — convenience for
 *                                    the admin-audit path.
 */

type Level = "debug" | "info" | "warn" | "error" | "fatal";

const MAX_KEY_LEN = 64;
const MAX_STR_LEN = 1000;
const MAX_KEYS = 32;
const REDACTED = "[REDACTED]";

const SECRET_KEYS = new Set([
  "password",
  "token",
  "csrf",
  "secret",
  "authorization",
  "cookie",
  "apikey",
  "api_key",
  "access_token",
  "refresh_token",
]);

function clamp(v: unknown, max: number): unknown {
  if (typeof v === "string") return v.length > max ? v.slice(0, max) : v;
  return v;
}

function safeMeta(input: Record<string, unknown> | undefined | null): Record<string, unknown> {
  if (!input || typeof input !== "object") return {};
  const out: Record<string, unknown> = {};
  let i = 0;
  for (const [k, v] of Object.entries(input)) {
    if (i++ >= MAX_KEYS) break;
    if (typeof k !== "string" || k.length === 0 || k.length > MAX_KEY_LEN) continue;
    const lower = k.toLowerCase();
    if (SECRET_KEYS.has(lower)) {
      out[k] = REDACTED;
      continue;
    }
    if (v === null || v === undefined) {
      out[k] = null;
      continue;
    }
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      out[k] = clamp(v, MAX_STR_LEN);
      continue;
    }
    try {
      out[k] = JSON.parse(JSON.stringify(v));
    } catch {
      out[k] = String(v).slice(0, MAX_STR_LEN);
    }
  }
  return out;
}

export interface LogEvent {
  level?: Level;
  event: string;
  /** Free-form context. Sensitive keys are auto-redacted. */
  fields?: Record<string, unknown>;
}

export function logEvent(input: LogEvent): void {
  try {
    const payload = {
      ts: new Date().toISOString(),
      level: input.level ?? "info",
      event: input.event,
      ...safeMeta(input.fields ?? {}),
    };
    console.log(JSON.stringify(payload));
  } catch {
    // Logger MUST NEVER throw.
  }
}

export function logError(event: string, err: unknown, fields: Record<string, unknown> = {}): void {
  const message = err instanceof Error ? err.message : String(err);
  const code = err instanceof Error && "code" in err ? String((err as { code: unknown }).code) : undefined;
  logEvent({
    level: "error",
    event,
    fields: {
      error: message.slice(0, MAX_STR_LEN),
      ...(code ? { code } : {}),
      ...fields,
    },
  });
}

export function logAuditFailure(params: {
  action: string;
  target_id: string | null;
  error: unknown;
}): void {
  const message = params.error instanceof Error ? params.error.message : String(params.error);
  logEvent({
    level: "error",
    event: "audit_log_write_failed",
    fields: {
      action: params.action,
      target_id: params.target_id,
      error: message.slice(0, MAX_STR_LEN),
      monitor: true,
    },
  });
}
