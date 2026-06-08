import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("preferences")
      .eq("id", user.id)
      .single();

    const currentPreferences =
      profile?.preferences && typeof profile.preferences === "object" && !Array.isArray(profile.preferences)
        ? profile.preferences
        : {};

    const { error } = await supabase.from("user_profiles").update({
      preferences: {
        ...currentPreferences,
        push_subscription: null,
        push_enabled: false,
      },
    }).eq("id", user.id);

    if (error) {
      return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const subscription = await request.json();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("preferences")
      .eq("id", user.id)
      .single();

    const currentPreferences =
      profile?.preferences && typeof profile.preferences === "object" && !Array.isArray(profile.preferences)
        ? profile.preferences
        : {};

    const { error } = await supabase.from("user_profiles").update({
      preferences: {
        ...currentPreferences,
        push_subscription: subscription,
        push_enabled: true,
      },
    }).eq("id", user.id);

    if (error) {
      return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}
