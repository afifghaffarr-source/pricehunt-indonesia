import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Settings, TrendingUp, Zap } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Extension Installed - BijakBeli.app",
  description: "BijakBeli Chrome Extension berhasil diinstall!",
  robots: "noindex",
};

export default function InstalledPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight">
          Selamat! Extension Terinstall 🎉
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
          BijakBeli Chrome Extension v3.0.1 siap membantu ribuan pembeli Indonesia!
        </p>
      </div>

      <Card className="mb-8 border-primary/20">
        <CardHeader>
          <CardTitle>Langkah Selanjutnya</CardTitle>
          <CardDescription>3 langkah cepat untuk mulai berkontribusi</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              1
            </div>
            <div>
              <h3 className="mb-1 font-semibold">Setup Ingestion Key</h3>
              <p className="text-sm text-muted-foreground">
                Klik icon extension di toolbar → Settings → masukkan key yang kami kirim
              </p>
              <Link href="/extension/setup">
                <Button variant="link" className="h-auto p-0 text-sm">
                  Cara dapat key →
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              2
            </div>
            <div>
              <h3 className="mb-1 font-semibold">Browse Marketplace</h3>
              <p className="text-sm text-muted-foreground">
                Buka Shopee, Tokopedia, Lazada, dll — extension otomatis scrape harga
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              3
            </div>
            <div>
              <h3 className="mb-1 font-semibold">Track Progress</h3>
              <p className="text-sm text-muted-foreground">
                Lihat stats di side panel — jumlah produk scraped, success rate, dll
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <Zap className="mb-2 h-8 w-8 text-yellow-500" />
            <CardTitle className="text-lg">Auto-Scrape</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Setiap halaman produk yang kamu lihat otomatis terkirim ke database
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Settings className="mb-2 h-8 w-8 text-blue-500" />
            <CardTitle className="text-lg">Side Panel</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Klik kanan icon extension → buka side panel untuk stats lengkap
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <TrendingUp className="mb-2 h-8 w-8 text-green-500" />
            <CardTitle className="text-lg">Impact</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Data kamu bantu ribuan pembeli Indonesia dapat harga terbaik
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 text-center">
        <Link href="/extension">
          <Button variant="outline">
            Kembali ke Halaman Extension
          </Button>
        </Link>
      </div>
    </div>
  );
}
