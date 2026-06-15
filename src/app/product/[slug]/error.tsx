'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Re-throwing not-found errors is a no-op (they still bubble up to
    // not-found.tsx), so we just skip logging them to avoid noise.
    if (error.digest?.includes('NEXT_HTTP_ERROR_FALLBACK')) {
      return;
    }
    console.error('Product page error:', error)
  }, [error])

  // Re-throw not-found errors so Next.js can render not-found.tsx with
  // the correct 404 status. Without this, error.tsx catches the
  // NEXT_HTTP_ERROR_FALLBACK;404 and renders with HTTP 200.
  if (error.digest?.includes('NEXT_HTTP_ERROR_FALLBACK')) {
    throw error;
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle>Produk Tidak Dapat Dimuat</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Maaf, terjadi kesalahan saat memuat detail produk. Produk mungkin tidak ditemukan atau sedang ada masalah teknis.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <pre className="text-xs bg-muted p-2 rounded overflow-auto">
              {error.message}
            </pre>
          )}
          <div className="flex gap-2">
            <Button onClick={() => reset()}>
              Coba Lagi
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/search'}>
              Cari Produk Lain
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
