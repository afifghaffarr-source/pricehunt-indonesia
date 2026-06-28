/**
 * Admin audit log helper.
 *
 * Phase 9 hardening. Provides a best-effort writer for the
 * `admin_audit_log` table (migration 125).
 *
 * Design:
 * - Best-effort: NEVER throws to the caller. If the DB write fails, the
 *   failure is logged via the structured logger but the admin action
 *   still succeeds. The audit log is observability, not a gate.
 * - Uses the service-role client to bypass RLS — admin_audit_log is
 *   locked down for non-service roles.
 * - Strips potentially sensitive fields from request headers before
 *   persisting.
 * - Stable JSON: input is shallow-cloned to keep metadata BoundedJson.
 * - Failures emit a structured `audit_log_write_failed` event so an
 *   on-call runbook / log drain (Vercel, Datadog, etc.) can alert on it.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditFailure, logError } from "@/lib/log";
import type { Json } from "@/lib/supabase/types";

export type AdminAuditAction =
  | "resolve_conflict"
  | "manual_offer_upsert"
  | "manual_offer_create"
  | "manual_offer_update"
  | "recheck_dispatch"
  | "recheck_decision"
  | "offer_decision"
  | "admin_login"
  | "admin_promote"
  | "admin_demote";

export interface AdminAuditInput {
  actorId: string | null;
  actorEmail: string | null;
  action: AdminAuditAction | string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  request?: Request | null;
}

const MAX_META_KEYS = 32;
const MAX_META_STR = 1000;
const MAX_UA = 240;
const MAX_IP = 64;

function safeString(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function safeMeta(input: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!input || typeof input !== "object") return {};
  const out: Record<string, unknown> = {};
  const entries = Object.entries(input).slice(0, MAX_META_KEYS);
  for (const [k, v] of entries) {
    if (typeof k !== "string" || k.length === 0 || k.length > 64) continue;
    if (v === null || v === undefined) {
      out[k] = null;
      continue;
    }
    if (typeof v === "string") {
      out[k] = v.length > MAX_META_STR ? v.slice(0, MAX_META_STR) : v;
      continue;
    }
    if (typeof v === "number" || typeof v === "boolean") {
      out[k] = v;
      continue;
    }
    // Skip functions, symbols, bigints. Coerce arrays/objects to string for safety.
    try {
      out[k] = JSON.parse(JSON.stringify(v));
    } catch {
      out[k] = String(v).slice(0, MAX_META_STR);
    }
  }
  return out;
}

function extractRequestContext(request: Request | null | undefined) {
  if (!request) return { ip: null, userAgent: null, requestId: null };

  const ip =
    safeString(request.headers.get("x-forwarded-for")?.split(",")[0], MAX_IP) ??
    safeString(request.headers.get("x-real-ip"), MAX_IP);

  const userAgent = safeString(request.headers.get("user-agent"), MAX_UA);
  const requestId =
    safeString(request.headers.get("x-request-id"), 64) ??
    safeString(request.headers.get("x-vercel-id"), 64);

  return { ip, userAgent, requestId };
}

/**
 * Best-effort write to the admin audit log. NEVER throws.
 *
 * On any failure the caller does NOT see an error. The failure is
 * emitted as a structured log event (`audit_log_write_failed`) so that
 * the operations log drain can alert on it.
 */
export async function logAdminAction(input: AdminAuditInput): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { ip, userAgent, requestId } = extractRequestContext(input.request);

    const row = {
      actor_id: input.actorId,
      actor_email: input.actorEmail,
      action: safeString(input.action, 64) ?? "unknown",
      target_type: safeString(input.targetType ?? null, 40),
      target_id: safeString(input.targetId ?? null, 128),
      // safeMeta sanitizes via JSON.parse(JSON.stringify(v)) so the runtime
      // shape is Json. Cast is safe here.
      metadata: safeMeta(input.metadata) as Json,
      ip,
      user_agent: userAgent,
      request_id: requestId,
    };

    const { error } = await supabase.from("admin_audit_log").insert(row);

    if (error) {
      logAuditFailure({
        action: row.action,
        target_id: row.target_id,
        error,
      });
    }
  } catch (err) {
    // Last-resort log. Logger swallows its own errors; we must not throw.
    logError("admin_audit_unexpected", err, {
      action: typeof input.action === "string" ? input.action : "unknown",
      target_id: input.targetId ?? null,
    });
  }
}
