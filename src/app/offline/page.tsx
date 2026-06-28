import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { WifiOff } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Anda Offline - BijakBeli.app",
  robots: { index: false, follow: false },
  alternates: { canonical: "/offline" },
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <WifiOff className="mb-4 h-16 w-16 text-muted-foreground" />
      <h1 className="mb-2 text-2xl font-bold">Anda Offline</h1>
      <p className="mb-6 max-w-sm text-muted-foreground">
        Koneksi internet tidak tersedia. Beberapa fitur mungkin tidak berfungsi.
        Coba lagi setelah koneksi pulih.
      </p>
      <Link href="/" className={buttonVariants({ variant: "default" })}>
        Kembali ke Beranda
      </Link>
    </div>
  );
}
