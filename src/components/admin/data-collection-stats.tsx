import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { 
  Database, 
  AlertCircle, 
  CheckCircle2, 
  Clock 
} from "lucide-react";

export async function DataCollectionStats() {
  const supabase = await createClient();

  // Fetch statistics
  const [offersResult, conflictsResult, rechecksResult, staleResult] = await Promise.all([
    // Total offers
    supabase
      .from("offers")
      .select("id", { count: "exact", head: true }),
    
    // Unresolved conflicts (FIXED: status not resolved)
    supabase
      .from("price_conflicts")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    
    // Pending rechecks (FIXED: request_status not status)
    supabase
      .from("recheck_requests")
      .select("id", { count: "exact", head: true })
      .eq("request_status", "pending"),
    
    // Stale offers (FIXED: is_active not is_available, not updated > 24 hours)
    supabase
      .from("offers")
      .select("id", { count: "exact", head: true })
      .lt("last_checked_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .eq("is_active", true),
  ]);

  const stats = [
    {
      title: "Total Offers",
      value: offersResult.count || 0,
      icon: Database,
      description: "Active product offers",
      color: "text-blue-600",
    },
    {
      title: "Conflicts",
      value: conflictsResult.count || 0,
      icon: AlertCircle,
      description: "Unresolved price conflicts",
      color: "text-orange-600",
    },
    {
      title: "Recheck Requests",
      value: rechecksResult.count || 0,
      icon: Clock,
      description: "Pending user requests",
      color: "text-purple-600",
    },
    {
      title: "Stale Data",
      value: staleResult.count || 0,
      icon: CheckCircle2,
      description: "Not updated > 24h",
      color: "text-red-600",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
