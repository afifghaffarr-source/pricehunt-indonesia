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
  const isPlaceholder = fallbackSrc.includes("placehold.co");

  useEffect(() => {
    if (!isPlaceholder || triedVexo) return;

    let cancelled = false;

    async function fetchImage() {
      try {
        const res = await fetch(`/api/vexo/images?q=${encodeURIComponent(productName)}&limit=1`);
        const data = await res.json();

        if (cancelled) return;

        if (data.results?.length > 0 && data.results[0].imageUrl) {
          setSrc(data.results[0].imageUrl);
        }
      } catch {
        // fallback stays
      }
      setTriedVexo(true);
    }

    fetchImage();
    return () => { cancelled = true; };
  }, [productName, isPlaceholder, triedVexo]);

  const handleError = () => {
    if (src !== fallbackSrc) {
      setSrc(fallbackSrc);
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
