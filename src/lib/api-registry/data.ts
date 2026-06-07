import { createClient } from "@/lib/supabase/server";
import type {
  ApiSourceCategory,
  ApiSourceWithCategory,
  ApiSourceCredential,
  ApiSourceUsageLog,
  ApiSourceHealthCheck,
} from "./types";

export async function getCategories(): Promise<ApiSourceCategory[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("api_source_categories").select("*").order("name");
  return data || [];
}

export async function getApiSources(): Promise<ApiSourceWithCategory[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("api_sources")
    .select("*, category:api_source_categories(*)")
    .order("priority", { ascending: true })
    .order("name");
  return (data || []) as unknown as ApiSourceWithCategory[];
}

export async function getApiSourceById(id: string): Promise<ApiSourceWithCategory | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("api_sources")
    .select("*, category:api_source_categories(*)")
    .eq("id", id)
    .single();
  return data as unknown as ApiSourceWithCategory | null;
}

export async function getCredentialForSource(sourceId: string): Promise<ApiSourceCredential[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("api_source_credentials")
    .select("*")
    .eq("api_source_id", sourceId);
  return data || [];
}

export async function getUsageLogs(sourceId: string, limit: number = 50): Promise<ApiSourceUsageLog[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("api_source_usage_logs")
    .select("*")
    .eq("api_source_id", sourceId)
    .order("requested_at", { ascending: false })
    .limit(limit);
  return data || [];
}

export async function getHealthChecks(sourceId: string, limit: number = 10): Promise<ApiSourceHealthCheck[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("api_source_health_checks")
    .select("*")
    .eq("api_source_id", sourceId)
    .order("checked_at", { ascending: false })
    .limit(limit);
  return data || [];
}

export async function logUsage(
  sourceId: string,
  log: { endpoint?: string; method?: string; status_code?: number; success: boolean; error_message?: string; duration_ms?: number }
) {
  const supabase = await createClient();
  await supabase.from("api_source_usage_logs").insert({ api_source_id: sourceId, ...log });
}

export async function saveHealthCheck(
  sourceId: string,
  check: { status: string; response_time_ms?: number; message?: string }
) {
  const supabase = await createClient();
  await supabase.from("api_source_health_checks").insert({ api_source_id: sourceId, ...check });
  await supabase.from("api_sources").update({ last_checked_at: new Date().toISOString() }).eq("id", sourceId);
}

export async function getRegistryStats() {
  const supabase = await createClient();
  const { data: sources } = await supabase.from("api_sources").select("id, status, priority, requires_api_key");
  const { data: categories } = await supabase.from("api_source_categories").select("id, name, slug");
  const allSources = sources || [];
  const statusCounts: Record<string, number> = {};
  let needsKey = 0;
  for (const s of allSources) {
    statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
    if (s.requires_api_key) needsKey++;
  }
  return { totalSources: allSources.length, totalCategories: (categories || []).length, statusCounts, needsKey, categories: categories || [] };
}