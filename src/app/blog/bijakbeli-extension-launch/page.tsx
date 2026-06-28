import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Download, Sparkles, Target } from "lucide-react";

export const metadata: Metadata = {
  title: "BijakBeli Chrome Extension v3 — Pantau Harga Otomatis di 6 Marketplace Indonesia",
  description:
    "Ekstensi Chrome gratis untuk membandingkan harga marketplace Indonesia — Shopee, Tokopedia, Lazada, Blibli, Bukalapak, TikTok Shop. Auto-scrape harga, deteksi diskon palsu, hemat belanja online.",
  keywords: [
    "ekstensi chrome indonesia",
    "bandingkan harga marketplace",
    "harga termurah",
    "bijak beli app",
    "shopee tokopedia lazada",
    "belanja online hemat",
    "price tracker indonesia",
  ],
  alternates: {
    canonical: "/blog/bijakbeli-extension-launch",
  },
  openGraph: {
    title: "BijakBeli Chrome Extension v3 Sudah Tersedia",
    description:
      "Pantau harga 6 marketplace Indonesia langsung dari browser. Gratis, transparan, tanpa iklan.",
    type: "article",
  },
};

export const dynamic = "force-static";

export default function LaunchBlogPost() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <article className="prose prose-slate dark:prose-invert max-w-none">
        <header className="not-prose mb-10 text-center">
          <span className="inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Pengumuman • v3.0.1
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            BijakBeli Chrome Extension v3 Sudah Tersedia
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Pantau harga 6 marketplace Indonesia langsung dari browser. Gratis,
            transparan, tanpa iklan — dan dibangun oleh komunitas.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Dipublikasi 28 Juni 2026 · 5 menit baca
          </p>
        </header>

        <section>
          <p>
            <strong>BijakBeli.app</strong> adalah proyek komunitas untuk membangun
            database harga marketplace Indonesia yang terbuka. Hari ini kami rilis{" "}
            <strong>Chrome Extension v3.0.1</strong> — alat gratis yang membantu kamu
            browse marketplace sambil otomatis mengumpulkan data harga untuk komunitas.
          </p>
        </section>

        <section>
          <h2>Cara kerjanya (30 detik baca)</h2>
          <ol>
            <li>
              <strong>Install extension</strong> dari Chrome Web Store (link download
              di bawah).
            </li>
            <li>
              <strong>Browse marketplace seperti biasa</strong> — Shopee, Tokopedia,
              Lazada, Blibli, Bukalapak, atau TikTok Shop.
            </li>
            <li>
              <strong>Setiap produk yang kamu lihat</strong> otomatis tercatat di
              database komunitas. Tidak ada klik tambahan, tidak ada popup mengganggu.
            </li>
          </ol>
          <p>
            Semakin banyak orang pakai, semakin akurat harga rata-rata yang bisa
            dihitung untuk semua orang.
          </p>
        </section>

        <section>
          <h2>Mengapa ini penting?</h2>
          <p>
            Membandingkan harga di 6 marketplace Indonesia itu melelahkan. Kamu harus
            buka 6 tab, copy-paste link, lihat harga, lalu hitung sendiri mana yang
            termurah. BijakBeli.app mengotomatisasi ini dengan crowdsourcing — data
            yang kamu lihat hari ini membantu orang lain besok.
          </p>

          <h3>Yang TIDAK kami lakukan</h3>
          <p>Berbeda dengan ekstensi serupa, kami tegas tidak:</p>
          <ul>
            <li>❌ Menampilkan iklan</li>
            <li>❌ Menjual data kamu ke pihak ketiga</li>
            <li>❌ Tracking kamu di luar marketplace</li>
            <li>❌ Mengumpulkan data pribadi (nama, email, telepon)</li>
            <li>❌ Mengakses password atau info pembayaran</li>
          </ul>
          <p>
            Semua tersimpan lokal di perangkat kamu (chrome.storage.local). Hanya data
            produk pilihan yang dikirim ke server dengan consent eksplisit.
          </p>
        </section>

        <section className="not-prose my-10 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-8">
          <Sparkles className="mb-3 h-8 w-8 text-primary" />
          <h3 className="mb-3 text-2xl font-bold">Segera Hadir: Price Drop Alerts</h3>
          <p className="mb-4 text-muted-foreground">
            Versi berikutnya (v3.1) akan menambahkan warning otomatis kalau produk
            yang kamu incar turun di bawah target harga kamu. Daftar sekarang untuk
            dapat notifikasi pertama:
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/extension">
              <span className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                <Download className="h-4 w-4" /> Download v3.0.1
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
            <Link href="/dashboard/alerts">
              <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted">
                <Target className="h-4 w-4" /> Daftar Price Alerts Beta
              </span>
            </Link>
          </div>
        </section>

        <section>
          <h2>Roadmap</h2>
          <ul>
            <li>
              <strong>v3.0.x (sekarang)</strong> — auto-scrape, retry queue, CSV
              export, sidepanel paritas
            </li>
            <li>
              <strong>v3.1 (Q3 2026)</strong> — Price drop alerts (prompt watchlist)
            </li>
            <li>
              <strong>v4.0 (Q4 2026)</strong> — Cross-marketplace price comparison
              panel langsung di halaman produk
            </li>
          </ul>
        </section>

        <section>
          <h2>Untuk developer & researcher</h2>
          <p>
            Source code extension terbuka di GitHub:{" "}
            <a
              href="https://github.com/afifghaffarr-source/pricehunt-indonesia"
              target="_blank"
              rel="noopener noreferrer"
            >
              github.com/afifghaffarr-source/pricehunt-indonesia
            </a>
            . API untuk konsumsi data harga (beserta dokumentasi rate limit) akan
            dipublikasi setelah versi stabil.
          </p>
        </section>

        <section className="not-prose mt-12 border-t pt-6">
          <p className="text-sm text-muted-foreground">
            Kontak: <a href="mailto:hello@bijakbeli.web.id">hello@bijakbeli.web.id</a>{" "}
            · <Link href="/legal#privacy">Privacy Policy</Link> ·{" "}
            <Link href="/extension">Extension</Link>
          </p>
        </section>
      </article>
    </main>
  );
}
