import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/push/subscribe
 * Save push notification subscription to user preferences
 * 
 * ✅ SECURITY: Requires authentication
 * ✅ DATA SAFETY: Merges with existing preferences (doesn't overwrite)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse subscription object from request
    const subscription = await request.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: "Invalid subscription object" },
        { status: 400 }
      );
    }

    // Get current user preferences to merge (not overwrite)
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("preferences")
      .eq("id", user.id)
      .single();

    const currentPreferences = (profile?.preferences as Record<string, unknown>) || {};

    // Merge push subscription with existing preferences
    const updatedPreferences = {
      ...currentPreferences,
      push_enabled: true,
      push_subscription: subscription,
    };

    // Update user preferences
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        preferences: updatedPreferences,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("[Push Subscribe] Database update failed:", updateError);
      return NextResponse.json(
        { error: "Failed to save subscription" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Push notification berhasil diaktifkan",
    });
  } catch (err) {
    console.error("[Push Subscribe] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/push/subscribe
 * Remove push notification subscription from user preferences
 * 
 * ✅ SECURITY: Requires authentication
 * ✅ DATA SAFETY: Only removes push fields, keeps other preferences
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current preferences
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("preferences")
      .eq("id", user.id)
      .single();

    const currentPreferences = (profile?.preferences as Record<string, unknown>) || {};

    // Remove push subscription but keep other preferences
    const { push_enabled, push_subscription, ...remainingPreferences } = currentPreferences;

    // Update with push fields removed
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        preferences: remainingPreferences,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("[Push Unsubscribe] Database update failed:", updateError);
      return NextResponse.json(
        { error: "Failed to remove subscription" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Push notification berhasil dinonaktifkan",
    });
  } catch (err) {
    console.error("[Push Unsubscribe] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
