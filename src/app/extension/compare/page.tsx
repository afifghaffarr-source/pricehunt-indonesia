import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, TrendingDown, TrendingUp, AlertCircle, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

export const metadata = {
  title: "Price Comparison - BijakBeli.app",
  description: "Compare current product price with historical data",
  robots: "noindex",
};

async function getPriceData(url: string) {
  // Fetch price history from API
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "https://www.bijakbeli.web.id"}/api/products/history?url=${encodeURIComponent(url)}`,
      { cache: "no-store" }
    );
    
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}

function PriceComparison({ url }: { url: string }) {
  return (
    <Suspense fallback={<PriceComparisonSkeleton />}>
      <PriceComparisonContent url={url} />
    </Suspense>
  );
}

async function PriceComparisonContent({ url }: { url: string }) {
  const data = await getPriceData(url);

  if (!data || !data.history || data.history.length === 0) {
    return (
      <Alert className="border-amber-500/50 bg-amber-500/10">
        <AlertCircle className="h-5 w-5 text-amber-600" />
        <AlertTitle>No Data Yet</AlertTitle>
        <AlertDescription>
          Belum ada data harga untuk produk ini. Extension akan auto-scrape saat kamu visit halaman produk.
        </AlertDescription>
      </Alert>
    );
  }

  const current = data.current || data.history[0];
  const lowest = data.lowest;
  const highest = data.highest;
  const avgPrice = data.average;
  const priceChange = data.change_percent;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Current Price</CardTitle>
          <CardDescription className="break-all">{url}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold">{formatPrice(current.price)}</span>
            {priceChange && priceChange !== 0 && (
              <Badge variant={priceChange < 0 ? "default" : "destructive"} className="gap-1">
                {priceChange < 0 ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                {Math.abs(priceChange).toFixed(1)}%
              </Badge>
            )}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: {new Date(current.captured_at).toLocaleString("id-ID")}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <TrendingDown className="mb-2 h-8 w-8 text-green-500" />
            <CardTitle className="text-lg">Lowest Price</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatPrice(lowest.price)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(lowest.captured_at).toLocaleDateString("id-ID")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <TrendingUp className="mb-2 h-8 w-8 text-red-500" />
            <CardTitle className="text-lg">Highest Price</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatPrice(highest.price)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(highest.captured_at).toLocaleDateString("id-ID")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-2 h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <span className="text-lg">~</span>
            </div>
            <CardTitle className="text-lg">Average Price</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatPrice(avgPrice)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Based on {data.history.length} data points
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Price Recommendation</CardTitle>
        </CardHeader>
        <CardContent>
          {current.price <= lowest.price * 1.05 ? (
            <Alert className="border-green-500/50 bg-green-500/10">
              <TrendingDown className="h-5 w-5 text-green-600" />
              <AlertTitle className="text-green-700">Good Deal!</AlertTitle>
              <AlertDescription className="text-green-600">
                Harga saat ini mendekati harga terendah. Waktu yang bagus untuk beli!
              </AlertDescription>
            </Alert>
          ) : current.price >= highest.price * 0.95 ? (
            <Alert className="border-red-500/50 bg-red-500/10">
              <TrendingUp className="h-5 w-5 text-red-600" />
              <AlertTitle className="text-red-700">High Price</AlertTitle>
              <AlertDescription className="text-red-600">
                Harga saat ini mendekati harga tertinggi. Pertimbangkan untuk tunggu diskon.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertCircle className="h-5 w-5" />
              <AlertTitle>Average Price</AlertTitle>
              <AlertDescription>
                Harga saat ini dalam range normal. Beli sekarang atau tunggu diskon sesuai kebutuhan.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <a href={url} target="_blank" rel="noopener noreferrer">
          <Button>
            <ExternalLink className="mr-2 h-4 w-4" />
            Visit Product Page
          </Button>
        </a>
        <Link href="/extension">
          <Button variant="outline">
            Back to Extension
          </Button>
        </Link>
      </div>
    </div>
  );
}

function PriceComparisonSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="h-6 w-32 animate-pulse rounded bg-muted"></div>
          <div className="h-4 w-full animate-pulse rounded bg-muted"></div>
        </CardHeader>
        <CardContent>
          <div className="h-10 w-48 animate-pulse rounded bg-muted"></div>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const params = await searchParams;
  const url = params.url;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight">
          Price Comparison
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Compare current price with historical data from BijakBeli database
        </p>
      </div>

      {!url ? (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <AlertTitle>Missing URL</AlertTitle>
          <AlertDescription>
            Please provide a product URL via query parameter: ?url=...
          </AlertDescription>
        </Alert>
      ) : (
        <PriceComparison url={url} />
      )}
    </div>
  );
}
