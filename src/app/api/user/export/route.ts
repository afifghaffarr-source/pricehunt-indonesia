import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/user/export - Export all user data
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Anda harus login untuk mengekspor data" },
        { status: 401 }
      );
    }

    // Gather all user data
    const [profileData, wishlistsData, alertsData, reviewsData] = await Promise.all([
      // User profile
      supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single(),
      
      // Wishlists (fixed from 'favorites')
      supabase
        .from("wishlists")
        .select(`
          *,
          product:products (
            id,
            slug,
            name,
            category,
            image_url
          )
        `)
        .eq("user_id", user.id),
      
      // Price alerts
      supabase
        .from("price_alerts")
        .select(`
          *,
          product:products (
            id,
            slug,
            name,
            category
          )
        `)
        .eq("user_id", user.id),
      
      // Reviews
      supabase
        .from("product_reviews")
        .select(`
          *,
          product:products (
            id,
            slug,
            name,
            category
          )
        `)
        .eq("user_id", user.id),
    ]);

    const profile = profileData.data || null;

    // Compile the export data. Keep search_history explicit even when the table
    // has not been introduced yet so the export shape stays predictable.
    const exportData = {
      export_date: new Date().toISOString(),
      export_version: "1.0",
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        metadata: user.user_metadata,
      },
      profile,
      preferences: profile?.preferences || {},
      wishlists: wishlistsData.data || [],
      price_alerts: alertsData.data || [],
      reviews: reviewsData.data || [],
      search_history: [],
      statistics: {
        total_wishlists: wishlistsData.data?.length || 0,
        total_alerts: alertsData.data?.length || 0,
        total_reviews: reviewsData.data?.length || 0,
      },
    };

    // Return as downloadable JSON with proper cache headers for private data
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="bijakbeli-data-export-${new Date().toISOString().split('T')[0]}.json"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
      },
    });
  } catch (err) {
    console.error("User data export error:", err);
    return NextResponse.json(
      { error: "Gagal mengekspor data pengguna. Coba lagi nanti." },
      {
        status: 500,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" },
      }
    );
  }
}
