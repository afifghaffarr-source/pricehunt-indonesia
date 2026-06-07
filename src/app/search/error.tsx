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
    console.error('Search page error:', error)
  }, [error])

  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle>Terjadi Kesalahan</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Maaf, terjadi kesalahan saat memuat hasil pencarian. Silakan coba lagi.
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
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              Ke Beranda
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
