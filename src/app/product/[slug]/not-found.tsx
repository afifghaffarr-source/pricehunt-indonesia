import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { SearchX, Home } from "lucide-react";

/**
 * Route-local not-found for /product/[slug]
 *
 * This is required because the parent route is streamed (uses Suspense for
 * async data fetching), and Next.js returns HTTP 200 for streamed not-found
 * responses by default. A dedicated not-found.tsx in the route segment
 * forces a non-streamed 404 response.
 *
 * See: https://nextjs.org/docs/app/api-reference/file-conventions/not-found
 */
export default function ProductNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <SearchX className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="mb-2 text-3xl font-bold">404</h1>
      <h2 className="mb-2 text-xl font-semibold">Produk Tidak Ditemukan</h2>
      <p className="mb-6 max-w-sm text-muted-foreground">
        Produk yang Anda cari tidak ada atau sudah dihapus dari database kami.
      </p>
      <div className="flex items-center gap-3">
        <Link href="/" className={buttonVariants({ variant: "default" })}>
          <Home className="mr-2 h-4 w-4" />
          Kembali ke Beranda
        </Link>
        <Link
          href="/search"
          className={buttonVariants({ variant: "outline" })}
        >
          Cari Produk
        </Link>
      </div>
    </div>
  );
}
