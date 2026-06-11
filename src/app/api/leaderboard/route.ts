import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: profiles, error } = await supabase
      .from("user_profiles")
      .select("id, display_name, preferences");

    if (error) {
      console.error("Leaderboard query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!profiles) {
      return NextResponse.json({ leaderboard: [] });
    }

    const leaderboard = profiles
      .map((p) => {
        const prefs = (p.preferences as Record<string, unknown>) || {};
        const wishlists = (prefs.wishlists as number) || 0;
        const alerts = (prefs.alerts as number) || 0;
        const searches = (prefs.search_count as number) || 0;
        const loginStreak = (prefs.login_streak as number) || 0;
        const comparisons = (prefs.comparison_count as number) || 0;

        const points =
          wishlists * 10 +
          alerts * 15 +
          searches * 5 +
          Math.min(loginStreak, 30) * 10 +
          comparisons * 20;

        let title = "Pemula";
        if (points >= 3000) title = "Legend BijakBeli";
        else if (points >= 1500) title = "Raja Harga";
        else if (points >= 700) title = "Master Perbandingan";
        else if (points >= 300) title = "Ahli Harga";
        else if (points >= 100) title = "Pencari Deal";

        return {
          id: p.id,
          name: (p.display_name as string) || "Anonymous",
          points,
          title,
          stats: { wishlists, alerts, searches, loginStreak, comparisons },
        };
      })
      .sort((a, b) => b.points - a.points)
      .slice(0, 50);

    return NextResponse.json({ leaderboard });
  } catch (err) {
    console.error("Leaderboard API error:", err);
    return NextResponse.json(
      { 
        error: "Failed to fetch leaderboard", 
        details: err instanceof Error ? err.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
