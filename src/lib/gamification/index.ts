import { createClient } from "@/lib/supabase/server";

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: number;
  type: "wishlist" | "alerts" | "searches" | "logins" | "comparisons";
}

export const BADGES: Badge[] = [
  { id: "first_wishlist", name: "Pengoleksi", description: "Simpan produk pertama ke wishlist", icon: "heart", requirement: 1, type: "wishlist" },
  { id: "wishlist_5", name: "Kolektor Handal", description: "Simpan 5 produk ke wishlist", icon: "hearts", requirement: 5, type: "wishlist" },
  { id: "wishlist_20", name: "Raja Wishlist", description: "Simpan 20 produk ke wishlist", icon: "crown", requirement: 20, type: "wishlist" },
  { id: "first_alert", name: "Pengintai Harga", description: "Buat price alert pertama", icon: "bell", requirement: 1, type: "alerts" },
  { id: "alerts_10", name: "Pemburu Deal", description: "Buat 10 price alerts", icon: "target", requirement: 10, type: "alerts" },
  { id: "search_10", name: "Pencari Murah", description: "Lakukan 10 pencarian", icon: "search", requirement: 10, type: "searches" },
  { id: "search_50", name: "Master Pencari", description: "Lakukan 50 pencarian", icon: "telescope", requirement: 50, type: "searches" },
  { id: "login_7", name: "User Setia", description: "Login 7 hari berturut-turut", icon: "flame", requirement: 7, type: "logins" },
  { id: "compare_5", name: "Analisis Pro", description: "Bandingkan 5 produk", icon: "scale", requirement: 5, type: "comparisons" },
];

export function calculatePoints(stats: {
  wishlists: number;
  alerts: number;
  searches: number;
  loginStreak: number;
  comparisons: number;
}): number {
  let points = 0;
  points += stats.wishlists * 10;
  points += stats.alerts * 15;
  points += stats.searches * 5;
  points += Math.min(stats.loginStreak, 30) * 10;
  points += stats.comparisons * 20;
  return points;
}

export function getLevel(points: number): { level: number; title: string; nextLevelAt: number } {
  const levels = [
    { level: 1, title: "Pemula", minPoints: 0 },
    { level: 2, title: "Pencari Deal", minPoints: 100 },
    { level: 3, title: "Ahli Harga", minPoints: 300 },
    { level: 4, title: "Master Perbandingan", minPoints: 700 },
    { level: 5, title: "Raja Harga", minPoints: 1500 },
    { level: 6, title: "Legend BijakBeli", minPoints: 3000 },
  ];

  let current = levels[0];
  let nextLevel = levels[1];

  for (let i = levels.length - 1; i >= 0; i--) {
    if (points >= levels[i].minPoints) {
      current = levels[i];
      nextLevel = levels[i + 1] || { level: levels[i].level + 1, title: "Max Level", minPoints: levels[i].minPoints * 2 };
      break;
    }
  }

  return {
    level: current.level,
    title: current.title,
    nextLevelAt: nextLevel.minPoints,
  };
}

export function getEarnedBadges(stats: {
  wishlists: number;
  alerts: number;
  searches: number;
  loginStreak: number;
  comparisons: number;
}): Badge[] {
  return BADGES.filter((badge) => {
    switch (badge.type) {
      case "wishlist": return stats.wishlists >= badge.requirement;
      case "alerts": return stats.alerts >= badge.requirement;
      case "searches": return stats.searches >= badge.requirement;
      case "logins": return stats.loginStreak >= badge.requirement;
      case "comparisons": return stats.comparisons >= badge.requirement;
      default: return false;
    }
  });
}

export async function getUserStats(userId: string) {
  const supabase = await createClient();

  const [wishlists, alerts, profile] = await Promise.all([
    supabase.from("wishlists").select("id", { count: "exact" }).eq("user_id", userId),
    supabase.from("price_alerts").select("id", { count: "exact" }).eq("user_id", userId),
    supabase.from("user_profiles").select("preferences").eq("id", userId).single(),
  ]);

  const prefs = (profile.data?.preferences as Record<string, unknown>) || {};

  return {
    wishlists: wishlists.count || 0,
    alerts: alerts.count || 0,
    searches: (prefs.search_count as number) || 0,
    loginStreak: (prefs.login_streak as number) || 1,
    comparisons: (prefs.comparison_count as number) || 0,
  };
}

export async function incrementUserStat(userId: string, stat: string, amount: number = 1) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("preferences")
    .eq("id", userId)
    .single();

  const prefs = (profile?.preferences as Record<string, unknown>) || {};
  const currentValue = (prefs[stat] as number) || 0;

  await supabase
    .from("user_profiles")
    .update({
      preferences: { ...prefs, [stat]: currentValue + amount },
    })
    .eq("id", userId);
}
