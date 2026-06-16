import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Lihat peringkat pengguna BijakBeli berdasarkan poin aktivitas.",
  alternates: {
    canonical: "/leaderboard",
  },
};

export const revalidate = 60;

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("id, display_name, preferences");

  const leaderboard = (profiles || [])
    .map((p) => {
      const prefs = (p.preferences as Record<string, unknown>) || {};
      const wishlists = (prefs.wishlists as number) || 0;
      const alerts = (prefs.alerts as number) || 0;
      const searches = (prefs.search_count as number) || 0;
      const loginStreak = (prefs.login_streak as number) || 0;
      const comparisons = (prefs.comparison_count as number) || 0;

      const points = wishlists * 10 + alerts * 15 + searches * 5 + Math.min(loginStreak, 30) * 10 + comparisons * 20;

      let title = "Pemula";
      if (points >= 3000) title = "Legend BijakBeli";
      else if (points >= 1500) title = "Raja Harga";
      else if (points >= 700) title = "Master Perbandingan";
      else if (points >= 300) title = "Ahli Harga";
      else if (points >= 100) title = "Pencari Deal";

      return {
        id: p.id as string,
        name: (p.display_name as string) || "Anonymous",
        points,
        title,
      };
    })
    .sort((a, b) => b.points - a.points)
    .slice(0, 50);

  const rankIcons = [Trophy, Medal, Award];
  const rankColors = ["text-yellow-500", "text-gray-400", "text-amber-600"];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <Trophy className="mx-auto mb-3 h-10 w-10 text-yellow-500" />
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground">Peringkat pengguna BijakBeli berdasarkan poin aktivitas.</p>
      </div>

      {leaderboard.length > 0 ? (
        <div className="space-y-3">
          {leaderboard.map((user, i) => {
            const RankIcon = rankIcons[i] || null;
            const rankColor = rankColors[i] || "";

            return (
              <Card key={user.id} className={i < 3 ? "border-2" : ""}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center">
                    {RankIcon ? (
                      <RankIcon className={`h-6 w-6 ${rankColor}`} />
                    ) : (
                      <span className="text-lg font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{user.name}</p>
                    <Badge variant="secondary" className="mt-0.5 text-xs">
                      {user.title}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">{user.points}</p>
                    <p className="text-xs text-muted-foreground">poin</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Trophy className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">Belum ada data leaderboard.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
