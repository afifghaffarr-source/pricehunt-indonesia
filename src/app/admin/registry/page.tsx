import { requireAuth } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getApiSources, getRegistryStats } from "@/lib/api-registry/data";
import { STATUS_LABELS, PRIORITY_LABELS, CATEGORY_LABELS } from "@/lib/api-registry/types";
import type { ApiSourceStatus, ApiSourceCategorySlug } from "@/lib/api-registry/types";
import Link from "next/link";
import { Globe, Key, CheckCircle, Clock, AlertTriangle, ExternalLink } from "lucide-react";

const STATUS_COLORS: Record<ApiSourceStatus, string> = {
  planned: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  testing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  limited: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  deprecated: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const PRIORITY_COLORS: Record<number, string> = {
  1: "text-red-600",
  2: "text-orange-600",
  3: "text-gray-600",
  4: "text-gray-400",
};

export default async function AdminRegistryPage() {
  const user = await requireAuth();
  const supabase = await createClient();
  const { data: profile } = await supabase.from("user_profiles").select("preferences").eq("id", user.id).single();
  const prefs = (profile?.preferences as Record<string, unknown>) || {};
  if (!prefs.is_admin) redirect("/dashboard");

  const [sources, stats] = await Promise.all([getApiSources(), getRegistryStats()]);

  const grouped = new Map<string, typeof sources>();
  for (const s of sources) {
    const catSlug = s.category?.slug || "unknown";
    if (!grouped.has(catSlug)) grouped.set(catSlug, []);
    grouped.get(catSlug)!.push(s);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">API Registry</h1>
        <p className="text-muted-foreground">Kelola dan pantau API eksternal Indonesia.</p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Globe className="h-4 w-4" /> Total API</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.totalSources}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Aktif</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">{stats.statusCounts["active"] || 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Clock className="h-4 w-4" /> Direncanakan</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-gray-500">{stats.statusCounts["planned"] || 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Key className="h-4 w-4" /> Butuh API Key</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-amber-600">{stats.needsKey}</p></CardContent></Card>
      </div>

      {Array.from(grouped.entries()).map(([catSlug, catSources]) => (
        <div key={catSlug} className="mb-8">
          <h2 className="mb-4 text-lg font-semibold">{CATEGORY_LABELS[catSlug as ApiSourceCategorySlug] || catSlug} ({catSources.length})</h2>
          <div className="space-y-3">
            {catSources.map((source) => (
              <Card key={source.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{source.name}</p>
                      <Badge className={STATUS_COLORS[source.status as ApiSourceStatus]}>{STATUS_LABELS[source.status as ApiSourceStatus]}</Badge>
                      {source.is_official && <Badge variant="outline" className="text-green-600 border-green-300">Official</Badge>}
                      {source.is_unofficial && <Badge variant="outline" className="text-amber-600 border-amber-300">Unofficial</Badge>}
                      {source.requires_api_key && <Badge variant="outline" className="gap-1"><Key className="h-3 w-3" /> API Key</Badge>}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                      <span className={PRIORITY_COLORS[source.priority]}>{PRIORITY_LABELS[source.priority]}</span>
                      <span>Auth: {source.auth_type}</span>
                      {source.provider && <span>Provider: {source.provider}</span>}
                    </div>
                    {source.use_case.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {source.use_case.map((uc) => (
                          <Badge key={uc} variant="secondary" className="text-[10px]">{uc}</Badge>
                        ))}
                      </div>
                    )}
                    {source.risk_note && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                        <AlertTriangle className="h-3 w-3" /> {source.risk_note}
                      </p>
                    )}
                  </div>
                  {source.documentation_url && (
                    <a href={source.documentation_url} target="_blank" rel="noopener noreferrer" className="ml-4 text-muted-foreground hover:text-foreground">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}