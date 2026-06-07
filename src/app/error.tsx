"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { AlertTriangle, Home, RefreshCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="mb-2 text-2xl font-bold">Terjadi Kesalahan</h1>
          <p className="mb-6 text-muted-foreground">
            Maaf, ada sesuatu yang salah. Tim kami sudah diberitahu.
          </p>
          {error.digest && (
            <p className="mb-6 text-xs text-muted-foreground">
              Error ID: {error.digest}
            </p>
          )}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={reset}
              className={buttonVariants({ variant: "outline" })}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Coba Lagi
            </button>
            <Link href="/" className={buttonVariants({ variant: "default" })}>
              <Home className="mr-2 h-4 w-4" />
              Beranda
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
