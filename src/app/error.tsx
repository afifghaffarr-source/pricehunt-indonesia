"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to error reporting service
    console.error("Application error:", error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">
            Ada yang tidak beres
          </h1>
          <p className="text-lg text-gray-600">
            Maaf, terjadi kesalahan saat memuat halaman ini.
          </p>
        </div>

        {process.env.NODE_ENV === "development" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left">
            <p className="font-mono text-sm text-red-800 break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="font-mono text-xs text-red-600 mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} size="lg">
            Coba Lagi
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => (window.location.href = "/")}
          >
            Kembali ke Beranda
          </Button>
        </div>

        <p className="text-sm text-gray-500">
          Jika masalah terus berlanjut, silakan{" "}
          <a href="/legal" className="text-blue-600 hover:underline">
            hubungi kami
          </a>
          .
        </p>
      </div>
    </div>
  )
}
