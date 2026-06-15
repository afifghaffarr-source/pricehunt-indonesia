/**
 * Job Logger Utility
 *
 * Stub-only logger for cron job execution tracking.
 *
 * HISTORY: Originally targeted a `job_logs` table + `get_job_statistics` /
 * `cleanup_old_job_logs` RPC functions that were never created in production.
 * Generated Supabase types (2026-06-15) confirmed the table doesn't exist.
 *
 * CURRENT: The schema uses `ingestion_logs` instead, which has no `job_name`
 * column. These helpers are no-op stubs that log to console for debugging.
 * They keep the public API working for the only caller (`cron/digest`).
 *
 * TODO: Migrate to actually write to `ingestion_logs` with
 * `metadata: { job_name: string }`. Then re-export real implementations.
 */

import { createAdminClient } from "./supabase/admin";

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
 * Stub: starts a job log entry. Returns null since no real log is created.
 */
export async function startJobLog(
  jobName: string,
  metadata?: Record<string, unknown>
): Promise<JobLogResult | null> {
  console.log(`[job-logger stub] startJobLog: ${jobName}`, metadata);
  return null;
}

/**
 * Stub: completes a job log entry. No-op.
 */
export async function completeJobLog(
  logId: string | null,
  data: JobLogData
): Promise<void> {
  console.log(`[job-logger stub] completeJobLog: ${logId ?? "null"}`, {
    jobName: data.jobName,
    processedCount: data.processedCount,
  });
}

/**
 * Stub: log a job outcome in one call. Returns void.
 * Convenience wrapper used by cron routes (e.g. cron/digest).
 */
export async function logJob(
  jobName: string,
  status: JobStatus,
  data: Partial<JobLogData> = {}
): Promise<void> {
  console.log(`[job-logger stub] logJob: ${jobName} → ${status}`, {
    processedCount: data.processedCount,
    successCount: data.successCount,
    failedCount: data.failedCount,
    errorSummary: data.errorSummary,
  });
}

/**
 * Stub: returns recent job log entries. Returns empty array.
 * Note: Original implementation queried a non-existent `job_logs` table.
 */
export async function getRecentJobLogs(
  _jobName: string,
  _limit: number = 10
): Promise<unknown[]> {
  console.warn("[job-logger stub] getRecentJobLogs called — no-op");
  return [];
}

/**
 * Stub: get job statistics. Returns empty array.
 * Note: Original implementation called non-existent `get_job_statistics` RPC.
 */
export async function getJobStatistics(
  _jobName?: string,
  _days: number = 7
): Promise<unknown[]> {
  console.warn("[job-logger stub] getJobStatistics called — no-op");
  return [];
}

/**
 * Stub: cleanup old job logs. Returns 0.
 * Note: Original implementation called non-existent `cleanup_old_job_logs` RPC.
 */
export async function cleanupOldJobLogs(): Promise<number> {
  console.warn("[job-logger stub] cleanupOldJobLogs called — no-op");
  return 0;
}

/**
 * Wrap a job function with automatic logging. Currently a pass-through
 * since the underlying logger is a no-op.
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
  await startJobLog(jobName);
  try {
    const outcome = await jobFn();
    await completeJobLog(null, {
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
    await completeJobLog(null, {
      jobName,
      errorSummary: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
