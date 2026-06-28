import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchPageContent } from "./SearchPageContent";
import { getAppUrl } from "@/lib/app-url";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = (await searchParams) ?? {};
  const query = q?.trim() ?? "";
  const ogUrl = `${getAppUrl()}/api/og/search${
    query ? `?q=${encodeURIComponent(query)}` : ""
  }`;
  return {
    title: query ? `Cari "${query}"` : "Cari Produk",
    description: query
      ? `Bandingkan harga ${query} dari 6 marketplace Indonesia. Temukan harga termurah dan deteksi diskon palsu.`
      : "Cari dan bandingkan harga produk dari berbagai marketplace Indonesia.",
    alternates: {
      canonical: "/search",
    },
    openGraph: {
      title: query ? `Cari "${query}" di BijakBeli` : "BijakBeli — Cari Produk",
      description: query
        ? `Bandingkan harga ${query} dari 6 marketplace Indonesia.`
        : "Cari dan bandingkan harga produk dari 6 marketplace Indonesia.",
      url: `${getAppUrl()}/search${query ? `?q=${encodeURIComponent(query)}` : ""}`,
      siteName: "BijakBeli.app",
      locale: "id_ID",
      type: "website",
      images: [
        {
          url: ogUrl,
          width: 1200,
          height: 630,
          alt: query
            ? `Hasil pencarian ${query} di BijakBeli`
            : "BijakBeli — Cari & bandingkan harga",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: query ? `Cari "${query}" di BijakBeli` : "BijakBeli — Cari Produk",
      description: query
        ? `Bandingkan harga ${query} dari 6 marketplace.`
        : "Cari dan bandingkan harga dari 6 marketplace Indonesia.",
      images: [ogUrl],
    },
  };
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchLoading />}>
      <SearchPageContent />
    </Suspense>
  );
}

function SearchLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 h-10 w-full animate-pulse rounded-lg bg-muted" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <div className="h-48 w-full animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-6 w-1/3 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
