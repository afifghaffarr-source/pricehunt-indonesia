import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  HelpCircle,
  Shield,
  Wallet,
  Bell,
  Settings,
  AlertTriangle,
  Mail,
} from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ — BijakBeli Chrome Extension",
  description:
    "Pertanyaan yang sering ditanyakan tentang BijakBeli Chrome Extension: setup, keamanan, watchlist, marketplace yang didukung, dan uninstall.",
  alternates: { canonical: "/extension/faq" },
};

const FAQ_GROUPS = [
  {
    icon: Settings,
    title: "Setup & Installation",
    questions: [
      {
        q: "Apa itu INGESTION_SECRET dan bagaimana cara mendapatkannya?",
        a: (
          <>
            <strong>INGESTION_SECRET</strong> adalah token bersama yang
            mengautentikasi submission produk extension ke database BijakBeli.
            Dapatkan di{" "}
            <Link
              href="/extension/setup"
              className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
            >
              halaman setup
            </Link>
            . Untuk saat ini hanya tersedia untuk beta tester yang sudah
            terdaftar. Setelah aplikasi dibuka untuk umum (Q3 2026), token
            akan otomatis ter-generate saat kamu sign up.
          </>
        ),
      },
      {
        q: "Saya install extension tapi popup cuma nampilin form kosong.",
        a: (
          <>
            Itu artinya extension berhasil terinstall dan siap pakai. Popup
            cuma menampilkan form INGESTION_SECRET untuk setup awal. Kalau
            kamu belum punya secret, klik link &quot;Dapatkan INGESTION_SECRET&quot; di
            popup untuk masuk ke halaman setup.
          </>
        ),
      },
      {
        q: "Apakah extension jalan di semua browser?",
        a: (
          <>
            Saat ini hanya Chrome (desktop, Chrome 108+) dan semua browser
            Chromium-based (Edge 108+, Brave 108+, Arc, dll). Firefox & Safari
            belum didukung — code base extension bisa di-port tapi sidepanel
            behavior di MV3-Firefox masih quota-limited, kami monitor
            ecosystem dulu.
          </>
        ),
      },
    ],
  },
  {
    icon: Shield,
    title: "Privacy & Keamanan",
    questions: [
      {
        q: "Apakah extension ini aman? Data saya dilihat siapa?",
        a: (
          <>
            Sangat aman. Kami tidak melihat atau menyimpan: nama, email,
            nomor telepon, alamat, password, payment info, atau browsing
            history di luar marketplace.{" "}
            <strong>142 baris audit penuh ada di</strong>{" "}
            <Link
              href="/extension/privacy-policy"
              className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
            >
              Privacy Policy
            </Link>
            . Source code terbuka di GitHub — bisa di-review siapa saja.
          </>
        ),
      },
      {
        q: "INGESTION_SECRET saya bocor. Apa yang harus saya lakukan?",
        a: (
          <>
            Karena INGESTION_SECRET adalah token <em>kelas</em> (bukan
            personal), dampaknya minimal: orang lain bisa submit produk atas
            nama kamu. Cara mitigasi:
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>
                Uninstall extension, bersihkan{" "}
                <code>chrome.storage.local</code>
              </li>
              <li>
                Email <code>privacy@bijakbeli.id</code> dengan subjek
                &quot;secret compromised&quot; — kami akan regenerate
              </li>
              <li>
                Install ulang extension setelah dapat secret baru
                (dalam &lt; 24 jam)
              </li>
            </ol>
          </>
        ),
      },
      {
        q: "Apakah extension mengirim data ke pihak ketiga?",
        a: "Tidak. Submission hanya ke server BijakBeli (Supabase + Vercel). Tidak ada Google Analytics di extension, tidak ada telemetri ke server pihak ketiga. Lihat Section 6 Privacy Policy.",
      },
    ],
  },
  {
    icon: Wallet,
    title: "Marketplace Support",
    questions: [
      {
        q: "Marketplace apa saja yang didukung?",
        a: (
          <>
            Enam marketplace Indonesia terbesar:{" "}
            <strong>Shopee, Tokopedia, Lazada, Blibli, Bukalapak, dan
            TikTok Shop</strong>. Marketplace lain (Orami, JD.id, Bhinneka)
            belum di-support. Kami menambah marketplace baru dengan hati-hati
            karena setiap tambahan host_permission memerlukan review Chrome.
          </>
        ),
      },
      {
        q: "Kenapa extension tidak scrape harga di halaman Tokopedia saya?",
        a: (
          <>
            Sebab umum:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                URL tersebut sebenarnya promo/dynamic-content
                (popup-inline, modal review) — content script skip
              </li>
              <li>
                SPA navigation setelah page-load (Tokopedia sering ganti URL
                tanpa reload) — refresh halaman (F5) biasanya fix
              </li>
              <li>
                Sudah pernah di-submit dalam 1 jam terakhir (deduplication) —
                tunggu 60 menit, atau buka variant produk
              </li>
            </ul>
            Kalau tetap tidak jalan, email kami URL produk + screenshot
            Console output di popup (lihat Troubleshooting).
          </>
        ),
      },
      {
        q: "Akan mendukung Amazon / eBay / marketplace luar negeri?",
        a: (
          <>
            Belum. Fokus saat ini adalah marketplace Indonesia — kami masih
            mengumpulkan data untuk community-pricing database lokal dulu.
            Tambahkan feature request di GitHub issues.
          </>
        ),
      },
    ],
  },
  {
    icon: Bell,
    title: "Notifikasi & Watchlist",
    questions: [
      {
        q: "Saya tidak mau terima notifikasi sama sekali.",
        a: (
          <>
            Tiga cara:
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>
                Jangan tambahkan produk apapun ke watchlist (default
                behavior setelah install)
              </li>
              <li>
                Buka <code>chrome://extensions</code> → BijakBeli → Site
                settings → ubah Notifications dari &quot;Allow&quot; menjadi &quot;Block&quot;
              </li>
              <li>
                Buka <code>chrome://settings/notifications</code> dan cari
                BijakBeli, set ke &quot;Off&quot;
              </li>
            </ol>
            Tanpa watchlist + notifikasi = privacy seperti extension ini
            tidak terinstall.
          </>
        ),
      },
      {
        q: "Kenapa notifikasi tidak muncul padahal harga sudah turun?",
        a: (
          <>
            Cooldown per produk adalah 24 jam — kalau sudah pernah dapat
            notifikasi untuk produk X dalam 24 jam terakhir, tidak akan
            muncul lagi meskipun harga turun lebih jauh. Ini anti-spam.
            Background worker cek setiap 30 menit (bukan real-time).
          </>
        ),
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 font-sans sm:px-6 lg:px-8">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
          <HelpCircle className="h-8 w-8 text-emerald-600" />
        </div>
        <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Pertanyaan yang Sering Ditanyakan
        </h1>
        <p className="mx-auto max-w-2xl text-base text-muted-foreground">
          FAQ tentang BijakBeli Chrome Extension — setup, keamanan,
          marketplace, watchlist, dan uninstall.
        </p>
      </div>

      <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
        <Badge variant="secondary">
          <Shield className="mr-1 h-3 w-3" /> Open-source
        </Badge>
        <Badge variant="secondary">
          <Wallet className="mr-1 h-3 w-3" /> 100% gratis
        </Badge>
        <Badge variant="secondary">
          <Bell className="mr-1 h-3 w-3" /> Notifikasi opt-in
        </Badge>
      </div>

      {FAQ_GROUPS.map((group) => {
        const Icon = group.icon;
        return (
          <section key={group.title} className="mb-10">
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold">
              <Icon className="h-6 w-6 text-emerald-600" />
              {group.title}
            </h2>
            <div className="space-y-3">
              {group.questions.map(({ q, a }) => (
                <Card key={q} className="border-zinc-200 dark:border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium leading-snug">
                      {q}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                    {a}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        );
      })}

      {/* Troubleshooting quick-ref */}
      <section className="mb-10 rounded-lg border border-amber-500/30 bg-amber-500/5 p-6">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-200">
            Troubleshooting Cepat
          </h2>
        </div>
        <div className="space-y-3 text-sm">
          <div>
            <strong>Extension tidak scrape halaman marketplace:</strong> Coba
            hard-refresh (Ctrl/Cmd + Shift + R). Cek Console di popup
            (klik kanan icon extension di toolbar → Inspect popup → Console
            tab). Kalau ada error merah, copy-paste ke email ke kami.
          </div>
          <div>
            <strong>Submission queue pending terlalu lama:</strong> Service
            worker kami cek setiap 5 menit. Kalau lebih dari 30 menit,
            kemungkinan besar masalah jaringan atau server maintenance
            (cek <Link href="/" className="underline">bijakbeli.web.id</Link>{" "}
            untuk status).
          </div>
          <div>
            <strong>INGESTION_SECRET tidak diterima:</strong> Cek format:
            harus alphanumeric string panjang, case-sensitive. Ada karakter
            spasi atau baris baru yang ikut ke-paste? Hapus lalu coba lagi.
          </div>
        </div>
      </section>

      {/* Contact + helpful links */}
      <section className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Mail className="h-5 w-5 text-blue-600" />
          Masih belum ketemu jawabannya?
        </h2>
        <p className="mb-4 text-sm text-zinc-700 dark:text-zinc-300">
          Tim kami merespons email dalam 72 jam (rata-rata 18 jam). Sertakan:
          Chrome version, URL produk yang bermasalah, screenshot Console output.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="mailto:privacy@bijakbeli.id"
            className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700"
          >
            📧 Email Support
          </a>
          <Link
            href="/extension/privacy-policy"
            className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            📋 Privacy Policy
          </Link>
          <a
            href="https://github.com/afifghaffarr-source/pricehunt-indonesia/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            🐛 GitHub Issues
          </a>
        </div>
      </section>

      <p className="text-center text-xs text-muted-foreground">
        Last updated: 28 Juni 2026 ·{" "}
        <Link
          href="/extension"
          className="underline underline-offset-2 hover:text-emerald-600"
        >
          Kembali ke extension hub
        </Link>
      </p>
    </main>
  );
}
