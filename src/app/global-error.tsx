"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log critical error
    console.error("Critical application error:", error)
  }, [error])

  return (
    <html lang="id">
      <body>
        <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-gray-900">
                Terjadi Kesalahan Sistem
              </h1>
              <p className="text-lg text-gray-600">
                Maaf, aplikasi mengalami masalah yang tidak terduga.
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

            <div className="flex flex-col gap-3">
              <button
                onClick={reset}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Coba Lagi
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Kembali ke Beranda
              </button>
            </div>

            <p className="text-sm text-gray-500">
              Jika masalah berlanjut, silakan refresh halaman atau kembali lagi
              nanti.
            </p>
          </div>
        </div>
      </body>
    </html>
  )
}
