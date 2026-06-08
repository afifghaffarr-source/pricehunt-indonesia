import Link from "next/link";
import { Tag } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Tag className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold">
                Price<span className="text-primary">Hunt</span>
              </span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              Bandingkan harga, pantau penurunan, dan tahu kapan waktu terbaik
              untuk membeli.
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Marketplace</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Tokopedia</li>
              <li>Shopee</li>
              <li>Bukalapak</li>
              <li>Lazada</li>
              <li>Blibli</li>
              <li>TikTok Shop</li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Kategori</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/search?category=Smartphone" className="hover:text-foreground transition-colors">
                  Smartphone
                </Link>
              </li>
              <li>
                <Link href="/search?category=Laptop" className="hover:text-foreground transition-colors">
                  Laptop
                </Link>
              </li>
              <li>
                <Link href="/search?category=Audio" className="hover:text-foreground transition-colors">
                  Audio
                </Link>
              </li>
              <li>
                <Link href="/search?category=Gaming" className="hover:text-foreground transition-colors">
                  Gaming
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Tentang</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/legal#accuracy" className="hover:text-foreground transition-colors">
                  Cara Kerja
                </Link>
              </li>
              <li>
                <Link href="/legal" className="hover:text-foreground transition-colors">
                  Tentang Kami
                </Link>
              </li>
              <li>
                <Link href="/legal#privacy" className="hover:text-foreground transition-colors">
                  Kebijakan Privasi
                </Link>
              </li>
              <li>
                <Link href="/legal#terms" className="hover:text-foreground transition-colors">
                  Syarat & Ketentuan
                </Link>
              </li>
              <li>
                <Link href="/legal#affiliate" className="hover:text-foreground transition-colors">
                  Disclosure Afiliasi
                </Link>
              </li>
              <li>
                <Link href="/legal#contact" className="hover:text-foreground transition-colors">
                  Kontak
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        <p className="text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} PriceHunt Indonesia. Semua harga
          bersifat indikatif dan dapat berubah sewaktu-waktu.
        </p>
      </div>
    </footer>
  );
}
