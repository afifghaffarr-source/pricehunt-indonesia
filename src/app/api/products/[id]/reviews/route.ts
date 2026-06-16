import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Type for raw review data from Supabase
interface RawReviewData {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  comment: string;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  user_profiles: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

// GET /api/products/[id]/reviews - List all reviews for a product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // ✅ SECURITY: Fetch reviews with user profiles (NOT auth.users email)
    const { data: reviews, error } = await supabase
      .from("product_reviews")
      .select(`
        id,
        product_id,
        user_id,
        rating,
        title,
        comment,
        helpful_count,
        created_at,
        updated_at,
        user_profiles!inner (
          display_name,
          avatar_url
        )
      `)
      .eq("product_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      // PGRST205 = table does not exist in schema cache. The reviews
      // migration may not have been applied to this Supabase project
      // yet. Treat it as "feature not yet available" rather than a
      // 500 — the client renders the empty state instead of an error
      // banner.
      const isMissingTable =
        error.code === "PGRST205" || /Could not find the table/i.test(error.message ?? "");

      if (isMissingTable) {
        return NextResponse.json(
          {
            reviews: [],
            stats: {
              totalReviews: 0,
              averageRating: 0,
              ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
            },
            available: false,
          },
          {
            headers: {
              "Cache-Control": "no-store, must-revalidate",
            },
          }
        );
      }

      console.error("Error fetching reviews:", error);
      return NextResponse.json(
        { error: "Gagal mengambil ulasan" },
        { status: 500 }
      );
    }

    // ✅ Transform reviews to safe public format (no email exposure)
    const safeReviews = (reviews as unknown as RawReviewData[])?.map((review) => ({
      id: review.id,
      product_id: review.product_id,
      user_id: review.user_id,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      helpful_count: review.helpful_count,
      created_at: review.created_at,
      updated_at: review.updated_at,
      user: {
        display_name: review.user_profiles?.display_name || "Pengguna",
        avatar_url: review.user_profiles?.avatar_url || null,
      },
    })) || [];

    // Calculate review statistics
    const totalReviews = safeReviews.length;
    const averageRating = totalReviews > 0
      ? safeReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;
    
    const ratingDistribution = {
      5: safeReviews.filter(r => r.rating === 5).length,
      4: safeReviews.filter(r => r.rating === 4).length,
      3: safeReviews.filter(r => r.rating === 3).length,
      2: safeReviews.filter(r => r.rating === 2).length,
      1: safeReviews.filter(r => r.rating === 1).length,
    };

    return NextResponse.json(
      {
        reviews: safeReviews,
        stats: {
          totalReviews,
          averageRating: Math.round(averageRating * 10) / 10,
          ratingDistribution,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, must-revalidate",
        },
      }
    );
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
