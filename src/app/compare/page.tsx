import { Suspense } from "react";
import type { Metadata } from "next";
import { CompareContent } from "./CompareContent";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bandingkan Produk",
  description: "Bandingkan harga dan spesifikasi produk secara berdampingan.",
  alternates: {
    canonical: "/compare",
  },
};

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-8"><div className="h-96 animate-pulse rounded-lg bg-muted" /></div>}>
      <CompareContent />
    </Suspense>
  );
}
