"use client";

import { Star } from "lucide-react";

interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

export function RatingStars({
  rating,
  maxRating = 5,
  size = "md",
  interactive = false,
  onChange,
}: RatingStarsProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const handleClick = (value: number) => {
    if (interactive && onChange) {
      onChange(value);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxRating }, (_, i) => {
        const value = i + 1;
        const isFilled = value <= rating;
        const isPartial = value > rating && value - 1 < rating;

        return (
          <button
            key={i}
            type="button"
            onClick={() => handleClick(value)}
            disabled={!interactive}
            className={`${interactive ? "cursor-pointer hover:scale-[1.02] transition-transform" : "cursor-default"}`}
          >
            <Star
              className={`${sizeClasses[size]} ${
                isFilled
                  ? "fill-yellow-400 text-yellow-400"
                  : isPartial
                  ? "fill-yellow-200 text-yellow-400"
                  : "fill-none text-gray-300"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
