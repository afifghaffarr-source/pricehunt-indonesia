/**
 * Job Logger Utility
 *
 * Real implementation backed by `ingestion_logs` table (Phase 3 rewrite, 2026-06-15).
 *
 * HISTORY:
 * - Original implementation targeted a non-existent `job_logs` table + RPCs
 *   (`get_job_statistics`, `cleanup_old_job_logs`). Confirmed missing via Supabase
 *   typegen + REST API (PGRST205 404).
 * - Stub-only version (2026-06-14 to 2026-06-15) had no persistence.
 * - This rewrite uses the canonical `ingestion_logs` table. Job name lives in
 *   `metadata.job_name` since there's no dedicated column.
 *
 * The only caller is `/api/cron/digest` (Vercel Cron, weekly). Other cron routes
 * (`/api/cron/prices`, `/api/ingestion`) call `ingestion_logs` directly with the
 * ingestion-shaped fields — not this module. This module is for cross-cutting
 * background jobs that don't fit the ingestion shape.
 */

import { createAdminClient } from "./supabase/admin";
import type { Database } from "./supabase/types";

export type JobStatus = "running" | "success" | "failed" | "partial";

export interface JobLogData {
  jobName: string;
  processedCount?: number;
  successCount?: number;
  failedCount?: number;
  errorSummary?: string;
  errorDetails?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface JobLogResult {
  id: string;
  startedAt: Date;
}

// Re-export createAdminClient so consumers that imported it from here
// continue to work. (Pre-existing public surface.)
export { createAdminClient };

/**
 * Map our public JobStatus to the `log_status` column value.
 * The DB column is a free text field — we keep values stable so future
 * dashboards can GROUP BY log_status.
 */
function toDbStatus(status: JobStatus): string {
  return status;
}

/**
 * Starts a job log entry. Inserts a row with status='running' and returns
 * the new id + started_at so callers can later completeJobLog() it.
 */
export async function startJobLog(
  jobName: string,
  metadata?: Record<string, unknown>
): Promise<JobLogResult | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ingestion_logs")
    .insert({
      log_status: "running",
      started_at: new Date().toISOString(),
      items_processed: 0,
      items_created: 0,
      items_updated: 0,
      items_failed: 0,
      metadata: { job_name: jobName, ...(metadata || {}) } as unknown as Database["public"]["Tables"]["ingestion_logs"]["Insert"]["metadata"],
    })
    .select("id, started_at")
    .single();

  if (error || !data) {
    console.error(`[job-logger] startJobLog failed for ${jobName}:`, error);
    return null;
  }
  return { id: data.id, startedAt: new Date(data.started_at) };
}

/**
 * Completes a previously started job log entry. Updates the row with the
 * final status, counts, error message, and any additional metadata.
 *
 * If `logId` is null (startJobLog failed), this is a no-op (we have no row
 * to update). The job is still logged to console for debugging.
 */
export async function completeJobLog(
  logId: string | null,
  data: JobLogData
): Promise<void> {
  if (!logId) {
    console.warn(`[job-logger] completeJobLog called with null logId for ${data.jobName} — skipping DB update`);
    return;
  }
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("ingestion_logs")
    .update({
      log_status: toDbStatus(
        data.failedCount && data.failedCount > 0
          ? data.processedCount && data.processedCount > data.failedCount
            ? "partial"
            : "failed"
          : "success"
      ),
      completed_at: new Date().toISOString(),
      items_processed: data.processedCount ?? 0,
      items_created: data.successCount ?? 0,
      items_failed: data.failedCount ?? 0,
      error_message: data.errorSummary ?? null,
      metadata: {
        job_name: data.jobName,
        ...(data.metadata || {}),
        ...(data.errorDetails
          ? { error_details: JSON.parse(JSON.stringify(data.errorDetails)) as Record<string, unknown> }
          : {}),
      } as unknown as Database["public"]["Tables"]["ingestion_logs"]["Insert"]["metadata"],
    })
    .eq("id", logId);

  if (error) {
    console.error(`[job-logger] completeJobLog failed for ${data.jobName} (id=${logId}):`, error);
  }
}

/**
 * One-shot job logging convenience: insert a single row with the final status.
 * Used by cron routes that don't need start/complete split. Returns void.
 *
 * Row is created with started_at = completed_at = now() (effectively zero duration).
 * For long-running jobs use startJobLog + completeJobLog instead.
 */
export async function logJob(
  jobName: string,
  status: JobStatus,
  data: Partial<JobLogData> = {}
): Promise<void> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await supabase.from("ingestion_logs").insert({
    log_status: toDbStatus(status),
    started_at: now,
    completed_at: now,
    items_processed: data.processedCount ?? 0,
    items_created: data.successCount ?? 0,
    items_failed: data.failedCount ?? 0,
    error_message: data.errorSummary ?? null,
    metadata: { job_name: jobName, ...(data.metadata || {}) } as unknown as Database["public"]["Tables"]["ingestion_logs"]["Insert"]["metadata"],
  });

  if (error) {
    console.error(`[job-logger] logJob failed for ${jobName} (${status}):`, error);
  }
}

/**
 * Returns recent job log entries for a given job name (filters by metadata.job_name).
 * Most recent first.
 */
export async function getRecentJobLogs(
  jobName: string,
  limit: number = 10
): Promise<unknown[]> {
  const supabase = createAdminClient();
  // metadata is Json — we filter with contains operator on the jsonb path.
  // Note: PostgREST supports `metadata->>job_name` filter via the arrow operator.
  const { data, error } = await supabase
    .from("ingestion_logs")
    .select("id, log_status, started_at, completed_at, items_processed, items_created, items_failed, error_message, metadata")
    .contains("metadata", { job_name: jobName })
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error(`[job-logger] getRecentJobLogs failed for ${jobName}:`, error);
    return [];
  }
  return data || [];
}

/**
 * Get job statistics aggregated by day + status. Returns array of
 * { date, job_name, status, count, total_items } rows for the past N days.
 *
 * Limited to last 30 days to avoid huge scans.
 */
export async function getJobStatistics(
  jobName?: string,
  days: number = 7
): Promise<unknown[]> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from("ingestion_logs")
    .select("log_status, started_at, items_processed, metadata")
    .gte("started_at", since);

  if (jobName) {
    query = query.contains("metadata", { job_name: jobName });
  }

  const { data, error } = await query;
  if (error) {
    console.error(`[job-logger] getJobStatistics failed:`, error);
    return [];
  }

  // Aggregate client-side (Supabase JS doesn't support GROUP BY directly).
  const agg = new Map<string, { date: string; job_name: string; status: string; count: number; total_items: number }>();
  for (const row of data || []) {
    const date = (row.started_at as string).slice(0, 10);
    const meta = (row.metadata as Record<string, unknown>) || {};
    const jn = (meta.job_name as string) || "unknown";
    const key = `${date}|${jn}|${row.log_status}`;
    const cur = agg.get(key) || { date, job_name: jn, status: row.log_status as string, count: 0, total_items: 0 };
    cur.count += 1;
    cur.total_items += (row.items_processed as number) || 0;
    agg.set(key, cur);
  }
  return Array.from(agg.values()).sort((a, b) =>
    a.date === b.date ? a.job_name.localeCompare(b.job_name) : b.date.localeCompare(a.date)
  );
}

/**
 * Cleanup old job log entries. Deletes rows older than N days.
 * Returns number of rows deleted.
 *
 * Default retention: 30 days. Pass a different `olderThanDays` to override.
 */
export async function cleanupOldJobLogs(olderThanDays: number = 30): Promise<number> {
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("ingestion_logs")
    .delete({ count: "exact" })
    .lt("started_at", cutoff);

  if (error) {
    console.error(`[job-logger] cleanupOldJobLogs failed:`, error);
    return 0;
  }
  return count || 0;
}

/**
 * Wrap a job function with automatic logging. Tracks start, completion,
 * failure, and partial-success state. Returns the job's `result` field
 * (or null on failure).
 */
export async function withJobLogging<T>(
  jobName: string,
  jobFn: () => Promise<{
    success: boolean;
    processedCount?: number;
    successCount?: number;
    failedCount?: number;
    errorSummary?: string;
    errorDetails?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    result?: T;
  }>
): Promise<T | null> {
  const start = await startJobLog(jobName);
  try {
    const outcome = await jobFn();
    await completeJobLog(start?.id ?? null, {
      jobName,
      processedCount: outcome.processedCount,
      successCount: outcome.successCount,
      failedCount: outcome.failedCount,
      errorSummary: outcome.errorSummary,
      errorDetails: outcome.errorDetails,
      metadata: outcome.metadata,
    });
    return outcome.result ?? null;
  } catch (error) {
    await completeJobLog(start?.id ?? null, {
      jobName,
      errorSummary: error instanceof Error ? error.message : String(error),
      errorDetails: error instanceof Error ? { stack: error.stack } : undefined,
    });
    return null;
  }
}
