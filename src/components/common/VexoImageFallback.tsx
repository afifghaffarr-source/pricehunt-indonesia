"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface VexoImageFallbackProps {
  productName: string;
  fallbackSrc: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
}

export function VexoImageFallback({
  productName,
  fallbackSrc,
  alt,
  fill,
  width,
  height,
  className,
  sizes,
  priority,
}: VexoImageFallbackProps) {
  const [src, setSrc] = useState(fallbackSrc);
  const [triedVexo, setTriedVexo] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Enhanced detection: placeholder URLs or sample/test URLs
  const isPlaceholderOrInvalid = 
    fallbackSrc.includes("placehold.co") || 
    fallbackSrc.includes("/sample/") ||
    fallbackSrc.includes("/test/") ||
    imageError;

  useEffect(() => {
    // Try VexoAPI if placeholder, invalid URL, or image load failed
    if (!isPlaceholderOrInvalid || triedVexo) return;

    let cancelled = false;

    async function fetchImage() {
      try {
        const res = await fetch(`/api/vexo/images?q=${encodeURIComponent(productName)}&limit=1`);
        const data = await res.json();

        if (cancelled) return;

        if (data.results?.length > 0 && data.results[0].imageUrl) {
          setSrc(data.results[0].imageUrl);
          setImageError(false); // Reset error state
        }
      } catch {
        // fallback stays
      }
      setTriedVexo(true);
    }

    fetchImage();
    return () => { cancelled = true; };
  }, [productName, isPlaceholderOrInvalid, triedVexo]);

  const handleError = () => {
    // Mark error and trigger VexoAPI fetch if not tried yet
    if (!imageError) {
      setImageError(true);
      if (!triedVexo) {
        setTriedVexo(false); // Reset to trigger useEffect
      }
    }
  };

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={className}
        sizes={sizes}
        priority={priority}
        onError={handleError}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width || 400}
      height={height || 400}
      className={className}
      sizes={sizes}
      priority={priority}
      onError={handleError}
    />
  );
}
