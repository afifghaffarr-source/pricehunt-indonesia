import { Suspense } from "react";
import { Metadata } from "next";
import { DataCollectionDashboard } from "@/components/admin/data-collection-dashboard";
import { DataCollectionStats } from "@/components/admin/data-collection-stats";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Data Collection | Admin | BijakBeli.app",
  description: "Manage data collection, offers, conflicts, and recheck requests",
};

export default function DataCollectionPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Data Collection</h1>
        <p className="text-muted-foreground mt-2">
          Kelola data collection, offers, conflicts, dan recheck requests
        </p>
      </div>

      {/* Statistics Overview */}
      <Suspense fallback={<StatsLoading />}>
        <DataCollectionStats />
      </Suspense>

      {/* Main Dashboard */}
      <Suspense fallback={<DashboardLoading />}>
        <DataCollectionDashboard />
      </Suspense>
    </div>
  );
}

function StatsLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
  );
}

function DashboardLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
