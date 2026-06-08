/**
 * Job Logger Utility
 * 
 * Provides helper functions for logging cron job and background task executions
 * to the job_logs table for monitoring and debugging.
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

/**
 * Start logging a job execution
 */
export async function startJobLog(jobName: string, metadata?: Record<string, unknown>): Promise<JobLogResult | null> {
  try {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from("job_logs" as any)
      .insert({
        job_name: jobName,
        status: "running" as JobStatus,
        started_at: new Date().toISOString(),
        metadata: metadata || {},
      } as any)
      .select("id, started_at")
      .single();
    
    if (error) {
      console.error(`Failed to start job log for ${jobName}:`, error);
      return null;
    }
    
    const logData = data as any;
    
    return {
      id: logData.id,
      startedAt: new Date(logData.started_at),
    };
  } catch (error) {
    console.error(`Exception starting job log for ${jobName}:`, error);
    return null;
  }
}

/**
 * Update a running job log with completion status
 */
export async function finishJobLog(
  logId: string,
  status: Exclude<JobStatus, "running">,
  data: Omit<JobLogData, "jobName">
): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    
    const result = await (supabase as any)
      .from("job_logs")
      .update({
        status,
        processed_count: data.processedCount || 0,
        success_count: data.successCount || 0,
        failed_count: data.failedCount || 0,
        error_summary: data.errorSummary,
        error_details: data.errorDetails,
        finished_at: new Date().toISOString(),
        metadata: data.metadata,
      })
      .eq("id", logId);
    
    const { error } = result;
    
    if (error) {
      console.error(`Failed to finish job log ${logId}:`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Exception finishing job log ${logId}:`, error);
    return false;
  }
}

/**
 * Log a complete job execution (start and finish in one call)
 * Useful for quick jobs or synchronous operations
 */
export async function logJob(
  jobName: string,
  status: Exclude<JobStatus, "running">,
  data: Omit<JobLogData, "jobName">
): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const now = new Date().toISOString();
    
    const { error } = await supabase
      .from("job_logs" as any)
      .insert({
        job_name: jobName,
        status,
        processed_count: data.processedCount || 0,
        success_count: data.successCount || 0,
        failed_count: data.failedCount || 0,
        error_summary: data.errorSummary,
        error_details: data.errorDetails,
        started_at: now,
        finished_at: now,
        metadata: data.metadata,
      } as any);
    
    if (error) {
      console.error(`Failed to log job ${jobName}:`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Exception logging job ${jobName}:`, error);
    return false;
  }
}

/**
 * Get recent job logs for a specific job
 */
export async function getRecentJobLogs(
  jobName: string,
  limit: number = 10
): Promise<unknown[]> {
  try {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from("job_logs" as any)
      .select("*")
      .eq("job_name", jobName)
      .order("created_at", { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error(`Failed to get recent logs for ${jobName}:`, error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error(`Exception getting recent logs for ${jobName}:`, error);
    return [];
  }
}

/**
 * Get job statistics for monitoring
 */
export async function getJobStatistics(
  jobName?: string,
  days: number = 7
): Promise<unknown[]> {
  try {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .rpc("get_job_statistics" as any, {
        p_job_name: jobName || null,
        p_days: days,
      } as any);
    
    if (error) {
      console.error("Failed to get job statistics:", error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error("Exception getting job statistics:", error);
    return [];
  }
}

/**
 * Cleanup old job logs (older than 30 days)
 */
export async function cleanupOldJobLogs(): Promise<number> {
  try {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .rpc("cleanup_old_job_logs" as any);
    
    if (error) {
      console.error("Failed to cleanup old job logs:", error);
      return 0;
    }
    
    return data || 0;
  } catch (error) {
    console.error("Exception cleaning up old job logs:", error);
    return 0;
  }
}

/**
 * Helper function to wrap job execution with automatic logging
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
  const log = await startJobLog(jobName);
  
  if (!log) {
    console.error(`Failed to start job log for ${jobName}, but continuing execution`);
  }
  
  try {
    const result = await jobFn();
    
    if (log) {
      await finishJobLog(
        log.id,
        result.success ? "success" : "failed",
        {
          processedCount: result.processedCount,
          successCount: result.successCount,
          failedCount: result.failedCount,
          errorSummary: result.errorSummary,
          errorDetails: result.errorDetails,
          metadata: result.metadata,
        }
      );
    }
    
    return result.result || null;
  } catch (error) {
    if (log) {
      await finishJobLog(log.id, "failed", {
        errorSummary: error instanceof Error ? error.message : "Unknown error",
        errorDetails: {
          error: error instanceof Error ? error.stack : String(error),
        },
      });
    }
    
    throw error;
  }
}
