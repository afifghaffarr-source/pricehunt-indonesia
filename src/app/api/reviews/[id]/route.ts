import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PATCH /api/reviews/[id] - Update a review
export async function PATCH(
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
        { error: "Anda harus login untuk mengubah ulasan" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { rating, title, comment } = body;

    // Validate input
    if (rating && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: "Rating harus antara 1-5" },
        { status: 400 }
      );
    }

    if (comment && comment.length < 10) {
      return NextResponse.json(
        { error: "Komentar minimal 10 karakter" },
        { status: 400 }
      );
    }

    // Update the review (RLS policy ensures user can only update their own review)
    const { data: review, error } = await supabase
      .from("product_reviews")
      .update({
        ...(rating && { rating }),
        ...(title !== undefined && { title }),
        ...(comment && { comment }),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating review:", error);
      return NextResponse.json(
        { error: "Gagal mengubah ulasan" },
        { status: 500 }
      );
    }

    if (!review) {
      return NextResponse.json(
        { error: "Ulasan tidak ditemukan atau Anda tidak memiliki akses" },
        { status: 404 }
      );
    }

    return NextResponse.json({ review });
  } catch (err) {
    console.error("Update review API error:", err);
    return NextResponse.json(
      {
        error: "Failed to update review",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/reviews/[id] - Delete a review
export async function DELETE(
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
        { error: "Anda harus login untuk menghapus ulasan" },
        { status: 401 }
      );
    }

    // Delete the review (RLS policy ensures user can only delete their own review)
    const { error } = await supabase
      .from("product_reviews")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting review:", error);
      return NextResponse.json(
        { error: "Gagal menghapus ulasan" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete review API error:", err);
    return NextResponse.json(
      {
        error: "Failed to delete review",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
