import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Lock, Mail, MessageSquare } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Setup Ingestion Key - BijakBeli.app",
  description: "Cara setup ingestion key untuk BijakBeli Chrome Extension",
  robots: "noindex",
};

export default function SetupPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10">
          <Lock className="h-12 w-12 text-amber-600" />
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight">
          Setup Ingestion Key
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Key diperlukan untuk autentikasi extension dengan database BijakBeli
        </p>
      </div>

      <Alert className="mb-8 border-amber-500/50 bg-amber-500/10">
        <AlertTriangle className="h-5 w-5 text-amber-600" />
        <AlertTitle>Beta Testing</AlertTitle>
        <AlertDescription>
          Ingestion key saat ini hanya untuk beta testers. Key dikirim via secure channel
          (bukan via halaman publik) untuk mencegah abuse.
        </AlertDescription>
      </Alert>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Cara Dapatkan Key</CardTitle>
          <CardDescription>
            Pilih salah satu metode berikut untuk mendapat key
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
              <MessageSquare className="h-6 w-6 text-blue-500" />
            </div>
            <div className="flex-1">
              <h3 className="mb-2 font-semibold">Telegram</h3>
              <p className="mb-3 text-sm text-muted-foreground">
                Hubungi maintainer via Telegram untuk onboarding beta
              </p>
              <a href="https://t.me/afifghaffarr" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  Contact via Telegram
                </Button>
              </a>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-500/10">
              <Mail className="h-6 w-6 text-green-500" />
            </div>
            <div className="flex-1">
              <h3 className="mb-2 font-semibold">Email</h3>
              <p className="mb-3 text-sm text-muted-foreground">
                Kirim request ke email maintainer dengan subject &quot;BijakBeli Extension Beta&quot;
              </p>
              <a href="mailto:afifghaffarr@gmail.com?subject=BijakBeli%20Extension%20Beta">
                <Button variant="outline" size="sm">
                  Send Email
                </Button>
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Cara Setup Key di Extension</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                1
              </span>
              <p className="text-sm">
                Klik icon BijakBeli Extension di toolbar Chrome (pojok kanan atas)
              </p>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                2
              </span>
              <p className="text-sm">
                Klik tombol &quot;Settings&quot; di popup
              </p>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                3
              </span>
              <p className="text-sm">
                Paste key yang kamu terima di field &quot;Ingestion Key&quot;
              </p>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                4
              </span>
              <p className="text-sm">
                Klik &quot;Save&quot; — extension siap digunakan!
              </p>
            </li>
          </ol>
        </CardContent>
      </Card>

      <Alert>
        <Lock className="h-5 w-5" />
        <AlertTitle>Keamanan Key</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            <strong>JANGAN share key ke siapapun.</strong> Key adalah credential autentikasi
            yang memberikan akses write ke database BijakBeli.
          </p>
          <p className="text-sm">
            Key dirotasi berkala. Jika key lama expired, hubungi maintainer untuk key baru.
          </p>
        </AlertDescription>
      </Alert>

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
