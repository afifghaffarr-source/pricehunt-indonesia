"use client";

import { useState } from "react";
import { RatingStars } from "./RatingStars";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";

interface ReviewFormProps {
  productId: string;
  onSuccess?: () => void;
}

export function ReviewForm({ productId, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (rating === 0) {
      setError("Pilih rating terlebih dahulu");
      return;
    }

    if (comment.length < 10) {
      setError("Komentar minimal 10 karakter");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rating,
          title: title.trim() || null,
          comment: comment.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Gagal mengirim ulasan");
        setIsSubmitting(false);
        return;
      }

      // Reset form
      setRating(0);
      setTitle("");
      setComment("");
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error("Error submitting review:", err);
      setError("Terjadi kesalahan saat mengirim ulasan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">
          Rating <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-3">
          <RatingStars
            rating={rating}
            size="lg"
            interactive
            onChange={setRating}
          />
          {rating > 0 && (
            <span className="text-sm text-gray-600">
              {rating === 1 && "Sangat Buruk"}
              {rating === 2 && "Buruk"}
              {rating === 3 && "Cukup"}
              {rating === 4 && "Bagus"}
              {rating === 5 && "Sangat Bagus"}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium">
          Judul (Opsional)
        </label>
        <Input
          id="title"
          type="text"
          placeholder="Ringkasan singkat tentang ulasan Anda"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="comment" className="text-sm font-medium">
          Komentar <span className="text-red-500">*</span>
        </label>
        <textarea
          id="comment"
          rows={4}
          placeholder="Ceritakan pengalaman Anda dengan produk ini (minimal 10 karakter)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          required
          minLength={10}
          disabled={isSubmitting}
        />
        <p className="text-xs text-gray-500">{comment.length} karakter</p>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || rating === 0}
        className={buttonVariants({ variant: "default", size: "default" }) + " w-full"}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Mengirim...
          </>
        ) : (
          "Kirim Ulasan"
        )}
      </button>
    </form>
  );
}
