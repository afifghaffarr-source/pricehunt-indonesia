import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/products/[id]/reviews - List all reviews for a product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: reviews, error } = await supabase
      .from("product_reviews")
      .select(`
        *,
        user:user_id (
          id,
          email,
          raw_user_meta_data
        )
      `)
      .eq("product_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching reviews:", error);
      return NextResponse.json(
        { error: "Gagal mengambil ulasan" },
        { status: 500 }
      );
    }

    // Calculate review statistics
    const totalReviews = reviews?.length || 0;
    const averageRating = totalReviews > 0
      ? reviews!.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;
    
    const ratingDistribution = {
      5: reviews?.filter(r => r.rating === 5).length || 0,
      4: reviews?.filter(r => r.rating === 4).length || 0,
      3: reviews?.filter(r => r.rating === 3).length || 0,
      2: reviews?.filter(r => r.rating === 2).length || 0,
      1: reviews?.filter(r => r.rating === 1).length || 0,
    };

    return NextResponse.json({
      reviews: reviews || [],
      stats: {
        totalReviews,
        averageRating: Math.round(averageRating * 10) / 10,
        ratingDistribution,
      },
    });
  } catch (err) {
    console.error("Reviews API error:", err);
    return NextResponse.json(
      {
        error: "Failed to fetch reviews",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST /api/products/[id]/reviews - Create a new review
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
        { error: "Anda harus login untuk menulis ulasan" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { rating, title, comment } = body;

    // Validate input
    if (!rating || !comment) {
      return NextResponse.json(
        { error: "Rating dan komentar wajib diisi" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating harus antara 1-5" },
        { status: 400 }
      );
    }

    if (comment.length < 10) {
      return NextResponse.json(
        { error: "Komentar minimal 10 karakter" },
        { status: 400 }
      );
    }

    // Insert the review
    const { data: review, error } = await supabase
      .from("product_reviews")
      .insert({
        product_id: id,
        user_id: user.id,
        rating,
        title: title || null,
        comment,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating review:", error);
      
      // Check for unique constraint violation (user already reviewed this product)
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Anda sudah memberikan ulasan untuk produk ini" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Gagal membuat ulasan" },
        { status: 500 }
      );
    }

    return NextResponse.json({ review }, { status: 201 });
  } catch (err) {
    console.error("Create review API error:", err);
    return NextResponse.json(
      {
        error: "Failed to create review",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
