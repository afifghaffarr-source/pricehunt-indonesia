"use client";

import { useEffect, useState } from "react";
import { ReviewCard } from "./ReviewCard";
import { ReviewForm } from "./ReviewForm";
import { RatingStars } from "./RatingStars";
import { Star, MessageSquare, Loader2 } from "lucide-react";

interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  helpful_count: number;
  verified_purchase: boolean;
  created_at: string;
  user_id: string;
  user?: {
    display_name: string;
    avatar_url: string | null;
  };
}

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

interface ReviewsListProps {
  productId: string;
  currentUserId?: string;
}

export function ReviewsList({ productId, currentUserId }: ReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  // `false` when the server reports the reviews table is missing.
  // We hide the section entirely instead of showing a permanent error.
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch(`/api/products/${productId}/reviews`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Gagal memuat ulasan");
          return;
        }

        // Server signals "feature not deployed" via available:false.
        // We silently skip rendering rather than alarming the user.
        if (data.available === false) {
          setAvailable(false);
          return;
        }

        setReviews(data.reviews);
        setStats(data.stats);
      } catch (err) {
        console.error("Error fetching reviews:", err);
        setError("Terjadi kesalahan saat memuat ulasan");
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviews();
  }, [productId]);

  const refreshReviews = async () => {
    try {
      const response = await fetch(`/api/products/${productId}/reviews`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Gagal memuat ulasan");
        return;
      }

      if (data.available === false) {
        setAvailable(false);
        return;
      }

      setReviews(data.reviews);
      setStats(data.stats);
    } catch (err) {
      console.error("Error fetching reviews:", err);
      setError("Terjadi kesalahan saat memuat ulasan");
    }
  };

  const handleHelpful = async (reviewId: string) => {
    const response = await fetch(`/api/reviews/${reviewId}/helpful`, {
      method: "POST",
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Gagal menandai ulasan");
    }
  };

  const handleDelete = async (reviewId: string) => {
    const response = await fetch(`/api/reviews/${reviewId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Gagal menghapus ulasan");
    }

    // Refresh reviews after deletion
    await refreshReviews();
  };

  const handleReviewSuccess = () => {
    setShowForm(false);
    refreshReviews();
  };

  const userHasReviewed = reviews.some(
    (review) => review.user_id === currentUserId
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Reviews table isn't deployed yet on this Supabase project — render
  // nothing rather than a permanent error banner.
  if (!available) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Stats Section */}
      {stats && stats.totalReviews > 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Average Rating */}
            <div>
              <div className="flex items-center gap-4">
                <div className="text-5xl font-bold text-gray-900">
                  {stats.averageRating.toFixed(1)}
                </div>
                <div>
                  <RatingStars rating={stats.averageRating} size="md" />
                  <p className="mt-1 text-sm text-gray-600">
                    {stats.totalReviews} ulasan
                  </p>
                </div>
              </div>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution];
                const percentage = stats.totalReviews > 0
                  ? (count / stats.totalReviews) * 100
                  : 0;

                return (
                  <div key={rating} className="flex items-center gap-2 text-sm">
                    <span className="w-8 text-gray-600">{rating} ★</span>
                    <div className="h-2 flex-1 rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-yellow-400"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-gray-600">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Review Form Section */}
      {currentUserId && !userHasReviewed && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Tulis Ulasan</h3>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Tambah Ulasan
              </button>
            )}
          </div>

          {showForm ? (
            <ReviewForm
              productId={productId}
              onSuccess={handleReviewSuccess}
            />
          ) : (
            <p className="text-sm text-gray-600">
              Bagikan pengalaman Anda dengan produk ini
            </p>
          )}
        </div>
      )}

      {userHasReviewed && currentUserId && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
          <MessageSquare className="mb-2 h-5 w-5" />
          Anda sudah memberikan ulasan untuk produk ini
        </div>
      )}

      {/* Reviews List */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-6 text-lg font-semibold">
          Ulasan Pelanggan {stats && `(${stats.totalReviews})`}
        </h3>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {reviews.length === 0 ? (
          <div className="py-12 text-center">
            <Star className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="text-gray-600">Belum ada ulasan untuk produk ini</p>
            <p className="mt-1 text-sm text-gray-500">
              Jadilah yang pertama untuk memberikan ulasan
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                currentUserId={currentUserId}
                onHelpful={currentUserId ? handleHelpful : undefined}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
