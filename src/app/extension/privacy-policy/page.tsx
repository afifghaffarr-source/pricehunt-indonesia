import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - BijakBeli Chrome Extension",
  description:
    "Bagaimana BijakBeli Chrome Extension mengumpulkan, menyimpan, dan menggunakan data Anda. Kebijakan privasi lengkap untuk versi 3.x.",
  alternates: {
    canonical: "/extension/privacy-policy",
  },
};

// Next.js 15.5.4 + Turbopack has a known issue where static prerendered pages
// wrapped in the root <Suspense> (because of /src/app/loading.tsx) end up with
// body content stuck inside <div hidden id="S:0"> and the page renders the
// loading skeleton forever. Forcing dynamic SSR bypasses static prerender.
// See src/app/extension/setup/page.tsx for the full note.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ExtensionPrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 font-sans">
      <h1 className="mb-2 text-3xl font-bold">Privacy Policy - BijakBeli Chrome Extension</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Berlaku untuk ekstensi <strong>v3.0.1</strong> dan seterusnya · Terakhir diperbarui: 28 Juni 2026
      </p>

      <p className="mb-8 text-base leading-relaxed">
        BijakBeli.app adalah project komunitas <em>open-source</em> untuk membantu pembeli
        Indonesia membandingkan harga marketplace. Ekstensi ini 100% gratis, tanpa iklan, dan
        tidak menjual data Anda. Dokumen ini menjelaskan secara terbuka data apa yang kami
        kumpulkan, bagaimana data tersebut digunakan, dan bagaimana Anda dapat mengontrolnya.
      </p>

      <nav className="mb-10 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-2 font-semibold">Daftar Isi</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Informasi yang Kami Kumpulkan</li>
          <li>Informasi yang TIDAK Kami Kumpulkan</li>
          <li>Bagaimana Kami Menggunakan Data</li>
          <li>Penyimpanan Data (Lokal vs Server)</li>
          <li>Izin Ekstensi & Justifikasinya</li>
          <li>Berbagi Data dengan Pihak Ketiga</li>
          <li>Notifikasi & Watchlist</li>
          <li>Cookies & Tracking</li>
          <li>Hak Anda sebagai Pengguna</li>
          <li>Keamanan Data</li>
          <li>Data Anak-anak</li>
          <li>Perubahan Kebijakan & Kontak</li>
        </ol>
      </nav>

      {/* 1. What we collect */}
      <section className="mb-10">
        <h2 className="mb-4 text-2xl font-semibold">1. Informasi yang Kami Kumpulkan</h2>

        <h3 className="mb-2 mt-4 text-xl font-semibold">1.1 Ringkasan data per kategori (untuk Chrome Web Store 2026)</h3>
        <p className="mb-3 leading-relaxed">
          Sejak awal 2026, Chrome Web Store mewajibkan developer untuk memilih kategori
          data yang dikumpulkan dari daftar tetap. Tabel di bawah menggunakan istilah
          resmi dari dashboard Chrome dan menjelaskan apa yang kami kumpulkan per kategori:
        </p>
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 dark:bg-zinc-900">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Kategori (Chrome Dashboard)</th>
                <th className="px-3 py-2 text-left font-semibold">Status</th>
                <th className="px-3 py-2 text-left font-semibold">Penjelasan</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-3 py-2 font-medium">Personally identifiable information</td>
                <td className="px-3 py-2 text-green-700 dark:text-green-400 font-semibold">Tidak dikumpulkan</td>
                <td className="px-3 py-2">Tidak ada nama, email, nomor telepon, atau alamat.</td>
              </tr>
              <tr className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-3 py-2 font-medium">Health information</td>
                <td className="px-3 py-2 text-green-700 dark:text-green-400 font-semibold">Tidak dikumpulkan</td>
                <td className="px-3 py-2">-</td>
              </tr>
              <tr className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-3 py-2 font-medium">Financial information</td>
                <td className="px-3 py-2 text-green-700 dark:text-green-400 font-semibold">Tidak dikumpulkan</td>
                <td className="px-3 py-2">Tidak ada akses ke metode pembayaran, kartu, atau dompet digital.</td>
              </tr>
              <tr className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-3 py-2 font-medium">Authentication information</td>
                <td className="px-3 py-2 text-green-700 dark:text-green-400 font-semibold">Tidak dikumpulkan</td>
                <td className="px-3 py-2">INGESTION_SECRET adalah token bersama (bukan identitas personal). Tidak ada username/password/kredensial login.</td>
              </tr>
              <tr className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-3 py-2 font-medium">Personal communications</td>
                <td className="px-3 py-2 text-green-700 dark:text-green-400 font-semibold">Tidak dikumpulkan</td>
                <td className="px-3 py-2">Tidak membaca email, chat, atau pesan.</td>
              </tr>
              <tr className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-3 py-2 font-medium">Location</td>
                <td className="px-3 py-2 text-green-700 dark:text-green-400 font-semibold">Tidak dikumpulkan</td>
                <td className="px-3 py-2">Tidak ada akses ke GPS atau alamat IP.</td>
              </tr>
              <tr className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-3 py-2 font-medium">Web history</td>
                <td className="px-3 py-2 text-green-700 dark:text-green-400 font-semibold">Tidak dikumpulkan</td>
                <td className="px-3 py-2">Ekstensi tidak menyimpan daftar URL yang Anda kunjungi. Hanya membaca halaman marketplace yang sedang aktif pada saat scrape.</td>
              </tr>
              <tr className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-3 py-2 font-medium">User activity</td>
                <td className="px-3 py-2 text-amber-700 dark:text-amber-400 font-semibold">Dikumpulkan (terbatas)</td>
                <td className="px-3 py-2">Background worker mengunjungi ulang URL produk di watchlist Anda (satu produk = satu request ke marketplace) untuk cek apakah harga berubah. Daftar URL ini hanya berasal dari items yang Anda tambahkan sendiri.</td>
              </tr>
              <tr className="border-t border-zinc-200 dark:border-zinc-800 bg-amber-50 dark:bg-amber-950/20">
                <td className="px-3 py-2 font-medium">Website content</td>
                <td className="px-3 py-2 text-amber-700 dark:text-amber-400 font-semibold">Dikumpulkan (marketplace saja)</td>
                <td className="px-3 py-2">Content script membaca elemen-elemen publik dari halaman produk marketplace: judul produk, harga, nama toko, rating seller. Tidak membaca elemen di luar area produk.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Untuk dashboard Chrome Web Store saat submit, jawablah sesuai tabel di atas.
          Versi lebih lengkap ada di <code>extension/LAUNCH_CHECKLIST.md</code> bagian
          &quot;Data Certification Matrix&quot;.
        </p>

        <h3 className="mb-2 mt-6 text-xl font-semibold">1.2 Data produk dari marketplace</h3>
        <p className="leading-relaxed">
          Setiap kali Anda membuka halaman produk di Shopee, Tokopedia, Lazada, Blibli,
          Bukalapak, atau TikTok Shop, ekstensi membaca informasi yang <strong>sudah ditampilkan
          oleh marketplace</strong> di halaman tersebut: judul produk, harga saat ini, nama toko,
          rating seller, dan URL halaman. Kami hanya membaca, kami tidak pernah menulis
          atau mengubah apapun di halaman marketplace.
        </p>

        <h3 className="mb-2 mt-4 text-xl font-semibold">1.3 INGESTION_SECRET</h3>
        <p className="leading-relaxed">
          Untuk mengirim data ke server BijakBeli, Anda memasukkan INGESTION_SECRET secara
          manual di popup ekstensi. Secret ini disimpan di <code>chrome.storage.local</code>{" "}
          (penyimpanan lokal browser Anda) dan tidak pernah dikirim selain sebagai header
          Authorization pada POST submission ke endpoint BijakBeli.
        </p>

        <h3 className="mb-2 mt-4 text-xl font-semibold">1.3 Submission timestamps</h3>
        <p className="leading-relaxed">
          Setiap kali ekstensi mengirim data produk ke server, kami mencatat timestamp
          untuk keperluan dedup (1 jam window) dan audit. Tidak ada data identitas personal
          yang terkait dengan timestamp ini.
        </p>

        <h3 className="mb-2 mt-4 text-xl font-semibold">1.4 Watchlist (opt-in)</h3>
        <p className="leading-relaxed">
          Jika Anda menambahkan produk ke fitur Watchlist (fitur pemantau harga), kami
          menyimpan <strong>URL produk, target harga yang Anda tetapkan, dan metadata
          minimal</strong> (judul, marketplace, timestamp). Watchlist disimpan lokal di
          <code>chrome.storage.local</code>. Tidak ada watchlist yang dikirim ke server.
        </p>
      </section>

      {/* 2. What we DO NOT collect */}
      <section className="mb-10">
        <h2 className="mb-4 text-2xl font-semibold">2. Informasi yang TIDAK Kami Kumpulkan</h2>
        <p className="mb-3 leading-relaxed">
          Untuk transparansi penuh, daftar ini mencakup semua kategori data yang secara
          eksplisit kami <strong>tidak</strong> kumpulkan:
        </p>
        <ul className="list-disc space-y-1 pl-6 leading-relaxed">
          <li>Nama, email, nomor telepon, atau data identitas personal lainnya</li>
          <li>Password atau kredensial login ke situs manapun</li>
          <li>Informasi pembayaran (kartu kredit, virtual account, e-wallet)</li>
          <li>Riwayat browsing di luar 6 marketplace yang didukung</li>
          <li>Lokasi geografis presisi (kota / negara cukup dari headers HTTP standar)</li>
          <li>Data finansial, kesehatan, atau biometrik</li>
          <li>Kontak, kalender, atau isi pesan</li>
          <li>File lokal di komputer Anda</li>
          <li>Clipboard atau histori copy-paste</li>
          <li>Audio, video, atau screenshot dari aktivitas Anda</li>
          <li>Interaksi dengan notifikasi ekstensi (kami tidak mengukur open-rate / click-rate)</li>
        </ul>
      </section>

      {/* 3. How we use data */}
      <section className="mb-10">
        <h2 className="mb-4 text-2xl font-semibold">3. Bagaimana Kami Menggunakan Data</h2>
        <p className="mb-3 leading-relaxed">Data yang kami kumpulkan digunakan untuk:</p>
        <ul className="list-disc space-y-2 pl-6 leading-relaxed">
          <li>Membangun database harga komunitas Indonesia (data agregat, terbuka untuk umum via web app)</li>
          <li>Menampilkan statistik harga historis untuk produk yang Anda scan sebelumnya (tab History di popup)</li>
          <li>Mendeteksi duplikat submission dalam window 1 jam untuk mencegah spam di server</li>
          <li>Mengirim notifikasi desktop jika produk di watchlist Anda turun ke target harga (opt-in, max 1× per item per 24 jam)</li>
        </ul>
        <p className="mt-3 leading-relaxed">
          Kami <strong>tidak</strong> menggunakan data untuk iklan bertarget, profiling
          personal, atau dijual kepada pihak ketiga mana pun.
        </p>
      </section>

      {/* 4. Storage */}
      <section className="mb-10">
        <h2 className="mb-4 text-2xl font-semibold">4. Penyimpanan Data</h2>

        <h3 className="mb-2 mt-4 text-xl font-semibold">4.1 Penyimpanan lokal (browser)</h3>
        <p className="leading-relaxed">
          Semua data pengguna, INGESTION_SECRET Anda, history submission lokal, watchlist,
          retry queue, disimpan di <code>chrome.storage.local</code> pada browser Anda.
          Data ini tidak dienkripsi di sisi kami, namun Chrome mengenkripsinya di disk
          untuk profil browser. Uninstall ekstensi akan menghapus semua data lokal.
        </p>

        <h3 className="mb-2 mt-4 text-xl font-semibold">4.2 Server BijakBeli</h3>
        <p className="leading-relaxed">
          Submission produk masuk ke database Supabase kami untuk agregasi publik. Field
          yang disimpan: <code>product_id, marketplace, price, title, seller, rating,
          submission_timestamp</code>. Tidak ada field yang menghubungkan submission ke
          identitas personal pengirim, dan database tidak menyimpan IP address.
        </p>

        <h3 className="mb-2 mt-4 text-xl font-semibold">4.3 Retry queue</h3>
        <p className="leading-relaxed">
          Jika submission gagal (offline, server error), ekstensi menyimpan payload di
          retry queue lokal dan mencoba ulang otomatis setiap 5 menit (max 3 percobaan).
          Payload dalam retry queue di-hash sebelum disimpan untuk mencegah inspeksi
          yang tidak disengaja via DevTools.
        </p>
      </section>

      {/* 5. Permissions justification */}
      <section className="mb-10">
        <h2 className="mb-4 text-2xl font-semibold">5. Izin Ekstensi & Justifikasinya</h2>
        <p className="mb-3 leading-relaxed">
          Chrome Web Store mewajibkan pengguna untuk menjelaskan setiap izin. Berikut
          izin yang diminta ekstensi kami dan kenapa:
        </p>
        <ul className="space-y-3 pl-0 leading-relaxed">
          <li>
            <strong>activeTab</strong>, Akses tab saat ini hanya saat Anda klik tombol
            &quot;Scrape this page&quot;. Tidak ada akses baca otomatis untuk semua tab.
          </li>
          <li>
            <strong>storage</strong>, Menyimpan history submission, retry queue, watchlist,
            dan INGESTION_SECRET di <code>chrome.storage.local</code>.
          </li>
          <li>
            <strong>tabs</strong>, Mendeteksi perubahan URL/judul tab untuk memicu
            scrape ulang di SPA (Shopee, Tokopedia, Lazada adalah SPA, render ulang tidak
            selalu ubah URL).
          </li>
          <li>
            <strong>scripting</strong>, Menyisipkan <code>marketplace-scraper.js</code> ke
            halaman marketplace yang match dengan pola host_permissions.
          </li>
          <li>
            <strong>alarms</strong>, Menjadwalkan dua task periodik: (a) retry flush
            submission gagal setiap 5 menit, (b) price-watch check setiap 30 menit.
          </li>
          <li>
            <strong>notifications</strong>, <strong>Hanya</strong> menampilkan notifikasi
            desktop saat produk di watchlist Anda turun ke target harga. Aturan detail ada
            di Section 7.
          </li>
        </ul>
      </section>

      {/* 6. Third-party sharing */}
      <section className="mb-10">
        <h2 className="mb-4 text-2xl font-semibold">6. Berbagi Data dengan Pihak Ketiga</h2>
        <p className="mb-3 leading-relaxed">
          Kami <strong>tidak menjual</strong> data pribadi Anda. Berikut situasi di mana
          data dapat dioper ke pihak ketiga:
        </p>
        <ul className="list-disc space-y-2 pl-6 leading-relaxed">
          <li>
            <strong>Supabase (database hosting):</strong> Submission produk masuk ke
            tabel di project Supabase kami untuk agregasi. Supabase hanya menyimpan
            data, mereka tidak memiliki akses baca ke field individual.
          </li>
          <li>
            <strong>Vercel (hosting & CDN):</strong> Web app di-host di Vercel. Request
            HTTP standar (URL, timestamp) lewat melalui infrastruktur mereka.
          </li>
          <li>
            <strong>Kepatuhan hukum:</strong> Jika ada permintaan sah dari aparat hukum
            Indonesia sesuai UU PDP &amp; proses hukum yang berlaku.
          </li>
        </ul>
      </section>

      {/* 7. Notifications policy */}
      <section className="mb-10">
        <h2 className="mb-4 text-2xl font-semibold">7. Notifikasi & Watchlist</h2>
        <p className="mb-3 leading-relaxed">
          Izin <code>notifications</code> adalah salah satu izin yang Chrome Web Store
          flag untuk review tambahan. Berikut transparansi penuh tentang penggunaannya:
        </p>
        <ul className="list-disc space-y-2 pl-6 leading-relaxed">
          <li>
            <strong>Trigger:</strong> Anda harus secara eksplisit menambahkan produk ke
            watchlist via side panel. Tidak ada notifikasi pada install, tidak ada notifikasi
            demo atau upsell.
          </li>
          <li>
            <strong>Kondisi:</strong> Background service worker cek harga produk di
            watchlist setiap 30 menit. Jika harga ≤ target Anda, fire notifikasi.
          </li>
          <li>
            <strong>Cooldown:</strong> Setiap watch item di-track <code>lastNotifiedAt</code>.
            Notifikasi berikutnya untuk produk yang sama di-suppress selama 24 jam,
            terlepas dari berapa kali harga turun setelahnya.
          </li>
          <li>
            <strong>Payload:</strong> Judul = nama produk. Body = &quot;Harga turun ke
            Rp&lt;current&gt; (target Rp&lt;target&gt;)&quot;. Klik → buka URL produk di tab baru.
          </li>
          <li>
            <strong>Tanpa telemetry:</strong> Kami tidak mengukur open-rate, click-rate,
            atau dismiss-rate dari notifikasi. Tidak ada event yang dikirim ke server
            saat Anda berinteraksi dengan notifikasi.
          </li>
          <li>
            <strong>Off by default:</strong> Jika Anda tidak menambahkan apapun ke
            watchlist, Anda tidak akan pernah menerima notifikasi dari ekstensi ini.
          </li>
        </ul>
      </section>

      {/* 8. Cookies */}
      <section className="mb-10">
        <h2 className="mb-4 text-2xl font-semibold">8. Cookies & Tracking</h2>
        <p className="leading-relaxed">
          Ekstensi BijakBeli sendiri tidak menggunakan cookies. Marketplace yang Anda
          kunjungi mungkin menggunakan cookies sendiri (Shopee, Tokopedia, dll), itu
          adalah cookies mereka, bukan kami. Kami tidak menanam tracking pixel, analytics
          script, atau fingerprinting apapun di halaman web manapun.
        </p>
      </section>

      {/* 9. User rights */}
      <section className="mb-10">
        <h2 className="mb-4 text-2xl font-semibold">9. Hak Anda sebagai Pengguna</h2>
        <p className="mb-3 leading-relaxed">Anda memiliki hak untuk:</p>
        <ul className="list-disc space-y-2 pl-6 leading-relaxed">
          <li>
            <strong>Menghapus semua data lokal:</strong> Uninstall ekstensi Chrome -
            semua data di <code>chrome.storage.local</code> hilang otomatis.
          </li>
          <li>
            <strong>Menghapus watchlist:</strong> Buka side panel → section &quot;Pantau
            Harga&quot; → klik tombol hapus pada item yang ingin dihapus, atau clear all.
          </li>
          <li>
            <strong>Menghapus history lokal:</strong> Popup → section &quot;History&quot; → klik
            &quot;Clear history&quot; untuk menghapus semua entry lokal.
          </li>
          <li>
            <strong>Menonaktifkan notifikasi:</strong> Buka <code>chrome://settings/content/notifications</code>{" "}
            dan blokir notifikasi dari ekstensi BijakBeli (watchlist tetap jalan, hanya
            tidak muncul pop-up).
          </li>
          <li>
            <strong>Mengekspor data Anda:</strong> Popup → &quot;Export CSV&quot; untuk download
            history lokal Anda.
          </li>
          <li>
            <strong>Review source code:</strong> Selalu tersedia di GitHub, semua logic
            terlihat, tidak ada obfuscation.
          </li>
        </ul>
      </section>

      {/* 10. Security */}
      <section className="mb-10">
        <h2 className="mb-4 text-2xl font-semibold">10. Keamanan Data</h2>
        <p className="leading-relaxed">
          Semua komunikasi antara ekstensi dan server menggunakan HTTPS dengan TLS.
          INGESTION_SECRET disimpan di <code>chrome.storage.local</code> dan hanya
          dikirim sebagai header <code>Authorization</code> ke endpoint BijakBeli (tidak
          pernah ke URL pihak ketiga). Server memvalidasi INGESTION_SECRET dengan
          hash comparison dan me-rate-limit per IP untuk mencegah abuse.
        </p>
        <p className="mt-3 leading-relaxed">
          Tidak ada sistem yang 100% aman. Jika Anda menemukan kerentanan keamanan,
          hubungi kami via email di bawah, kami merespons dalam 72 jam.
        </p>
      </section>

      {/* 11. Children */}
      <section className="mb-10">
        <h2 className="mb-4 text-2xl font-semibold">11. Data Anak-anak</h2>
        <p className="leading-relaxed">
          Layanan kami ditujukan untuk pengguna berusia 13 tahun ke atas (sesuai
          Chrome Web Store policy). Kami tidak dengan sengaja mengumpulkan data dari
          pengguna di bawah usia tersebut. Jika kami mengetahui ada data yang
          terkumpul dari anak di bawah 13 tahun, kami akan menghapusnya sesegera
          mungkin setelah verifikasi.
        </p>
      </section>

      {/* 12. Changes & contact */}
      <section className="mb-10">
        <h2 className="mb-4 text-2xl font-semibold">12. Perubahan Kebijakan & Kontak</h2>
        <p className="mb-3 leading-relaxed">
          Versi dokumen ini ditampilkan di bagian atas. Jika kami melakukan perubahan
          material: kami mengumumkan via blog di{" "}
          <a href="/blog" className="text-blue-600 underline">bijakbeli.web.id/blog</a>{" "}
          dan/atau via banner di web app.
        </p>
        <p className="mb-3 leading-relaxed">
          Pertanyaan, keluhan, atau permintaan hapus data:
        </p>
        <ul className="list-none space-y-1 pl-0 leading-relaxed">
          <li>
            Email: <a href="mailto:privacy@bijakbeli.id" className="text-blue-600 underline">privacy@bijakbeli.id</a>
          </li>
          <li>
            Website:{" "}
            <a href="https://www.bijakbeli.web.id" className="text-blue-600 underline">
              www.bijakbeli.web.id
            </a>
          </li>
          <li>
            Source code:{" "}
            <a
              href="https://github.com/afifghaffarr-source/pricehunt-indonesia"
              className="text-blue-600 underline"
              rel="noopener noreferrer"
              target="_blank"
            >
              github.com/afifghaffarr-source/pricehunt-indonesia
            </a>
          </li>
        </ul>
      </section>

      <p className="mt-12 text-xs text-muted-foreground">
        Dokumen ini di-render dari source code terbuka. Versi canonical selalu di{" "}
        <a
          href="https://www.bijakbeli.web.id/extension/privacy-policy"
          className="underline"
        >
          bijakbeli.web.id/extension/privacy-policy
        </a>
        .
      </p>
    </main>
  );
}
