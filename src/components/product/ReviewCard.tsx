"use client";

import { useState } from "react";
import { ThumbsUp, Trash2, Edit } from "lucide-react";
import { RatingStars } from "./RatingStars";

interface ReviewCardProps {
  review: {
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
  };
  currentUserId?: string;
  onHelpful?: (reviewId: string) => Promise<void>;
  onEdit?: (reviewId: string) => void;
  onDelete?: (reviewId: string) => Promise<void>;
}

export function ReviewCard({
  review,
  currentUserId,
  onHelpful,
  onEdit,
  onDelete,
}: ReviewCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [helpfulCount, setHelpfulCount] = useState(review.helpful_count);
  const [isHelpful, setIsHelpful] = useState(false);

  const isOwner = currentUserId === review.user_id;
  const displayName = review.user?.display_name || "Pengguna";

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  const handleHelpful = async () => {
    if (!onHelpful) return;
    
    try {
      await onHelpful(review.id);
      setIsHelpful(!isHelpful);
      setHelpfulCount(prev => isHelpful ? prev - 1 : prev + 1);
    } catch (error) {
      console.error("Error marking review as helpful:", error);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !confirm("Yakin ingin menghapus ulasan ini?")) return;

    setIsDeleting(true);
    try {
      await onDelete(review.id);
    } catch (error) {
      console.error("Error deleting review:", error);
      setIsDeleting(false);
    }
  };

  return (
    <div className="border-b border-gray-200 py-6 last:border-b-0">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-semibold">
              {displayName[0].toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-gray-900">{displayName}</p>
              <p className="text-sm text-gray-500">{formatDate(review.created_at)}</p>
            </div>
            {review.verified_purchase && (
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                Pembelian Terverifikasi
              </span>
            )}
          </div>

          <div className="mb-2">
            <RatingStars rating={review.rating} size="sm" />
          </div>

          {review.title && (
            <h4 className="font-semibold text-gray-900 mb-1">{review.title}</h4>
          )}

          <p className="text-gray-700 leading-relaxed">{review.comment}</p>

          <div className="mt-4 flex items-center gap-4">
            {onHelpful && !isOwner && (
              <button
                onClick={handleHelpful}
                className={`flex items-center gap-1.5 text-sm ${
                  isHelpful
                    ? "text-blue-600 font-medium"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <ThumbsUp className={`h-4 w-4 ${isHelpful ? "fill-current" : ""}`} />
                <span>Membantu ({helpfulCount})</span>
              </button>
            )}

            {isOwner && (
              <div className="flex items-center gap-2">
                {onEdit && (
                  <button
                    onClick={() => onEdit(review.id)}
                    className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>{isDeleting ? "Menghapus..." : "Hapus"}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
