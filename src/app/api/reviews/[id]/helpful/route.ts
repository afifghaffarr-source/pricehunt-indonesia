import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/reviews/[id]/helpful - Toggle helpful vote on a review
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Anda harus login untuk menandai ulasan sebagai membantu" },
        { status: 401 }
      );
    }

    // Check if user already marked this review as helpful
    const { data: existing } = await supabase
      .from("review_helpfulness")
      .select("id")
      .eq("review_id", id)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      // Remove the helpful mark (unhelpful)
      const { error } = await supabase
        .from("review_helpfulness")
        .delete()
        .eq("review_id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error removing helpful mark:", error);
        return NextResponse.json(
          { error: "Gagal menghapus tanda membantu" },
          { status: 500 }
        );
      }

      return NextResponse.json({ helpful: false });
    } else {
      // Add helpful mark
      const { error } = await supabase
        .from("review_helpfulness")
        .insert({
          review_id: id,
          user_id: user.id,
        });

      if (error) {
        console.error("Error adding helpful mark:", error);
        return NextResponse.json(
          { error: "Gagal menandai sebagai membantu" },
          { status: 500 }
        );
      }

      return NextResponse.json({ helpful: true });
    }
  } catch (err) {
    console.error("Helpful vote API error:", err);
    return NextResponse.json(
      {
        error: "Failed to toggle helpful vote",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
