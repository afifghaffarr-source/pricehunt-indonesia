"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Package } from "lucide-react";

interface VexoImageFallbackProps {
  productName: string;
  fallbackSrc?: string;
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
  const [src, setSrc] = useState(fallbackSrc || "");
  const [triedVexo, setTriedVexo] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Enhanced detection: placeholder URLs, sample/test URLs, or empty
  const isPlaceholderOrInvalid = 
    !fallbackSrc ||
    fallbackSrc === "" ||
    fallbackSrc.includes("placehold.co") || 
    fallbackSrc.includes("/sample/") ||
    fallbackSrc.includes("/test/") ||
    imageError;

  useEffect(() => {
    // Try VexoAPI if placeholder, invalid URL, or image load failed
    if (!isPlaceholderOrInvalid || triedVexo) return;

    let cancelled = false;

    async function fetchImage() {
      // 1) Try VexoAPI first
      try {
        const res = await fetch(`/api/vexo/images?q=${encodeURIComponent(productName)}&limit=1`);
        const data = await res.json();
        if (cancelled) return;
        if (data.results?.length > 0 && data.results[0].imageUrl) {
          setSrc(data.results[0].imageUrl);
          setImageError(false);
          return;
        }
      } catch {
        // continue to fallback
      }

      // 2) Fallback to Unsplash Source (free, no API key)
      if (cancelled) return;
      const keywords = productName
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2 && !['the','and','for','with','gen','rgb','inch','new','m2','m3','m1','core','ultra'].includes(w.toLowerCase()))
        .slice(0, 3)
        .join(',');
      if (keywords) {
        // Use Lorem Picsum as stable free placeholder (always returns valid image)
        setSrc(`https://picsum.photos/seed/${encodeURIComponent(keywords)}/600/600`);
        setImageError(false);
      }

      setTriedVexo(true);
    }

    fetchImage();
    return () => { cancelled = true; };
  }, [productName, isPlaceholderOrInvalid, triedVexo]);

  const handleError = () => {
    if (!imageError) {
      setImageError(true);
      if (!triedVexo) {
        setTriedVexo(false);
      }
    }
  };

  // No image available - show placeholder
  if (!src || src === "" || (imageError && triedVexo)) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-muted to-muted/50 ${className || ""}`}>
        <Package className="h-16 w-16 text-muted-foreground/30" />
      </div>
    );
  }

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
