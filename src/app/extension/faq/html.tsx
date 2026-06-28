/**
 * JSX-rendered HTML bodies keyed by FAQ entry id. The plain-text body lives
 * in ./data.ts and is exported through JSON-LD + /extension/faq.json.
 * Keep these two in sync; if you change wording, update BOTH.
 *
 * The Bahasa map covers all 11 entries with full markup. The English map
 * is for the longer entries that benefit from list formatting; the rest
 * fall back to the plain text in data.ts (rendered as <p>).
 */

import type { ReactNode } from "react";
import Link from "next/link";

export type HtmlMap = Record<string, ReactNode>;

// Bahasa IDs are slugified Indonesian tokens; map mirrors BAHASA_FAQ from
// data.ts.
export const BAHASA_HTML: HtmlMap = {
  "apa-itu-ingestion-secret-dan-bagaimana-cara-mendapatkannya": (
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
      . Untuk saat ini hanya tersedia untuk beta tester yang sudah terdaftar.
      Setelah aplikasi dibuka untuk umum (Q3 2026), token akan otomatis
      ter-generate saat kamu sign up.
    </>
  ),
  "saya-install-extension-tapi-popup-cuma-nampilin-form-kosong": (
    <>
      Itu artinya extension berhasil terinstall dan siap pakai. Popup cuma
      menampilkan form INGESTION_SECRET untuk setup awal. Kalau kamu belum
      punya secret, klik link &quot;Dapatkan INGESTION_SECRET&quot; di popup
      untuk masuk ke halaman setup.
    </>
  ),
  "apakah-extension-jalan-di-semua-browser": (
    <>
      Saat ini hanya Chrome (desktop, Chrome 108+) dan semua browser
      Chromium-based (Edge 108+, Brave 108+, Arc, dll). Firefox & Safari
      belum didukung — code base extension bisa di-port tapi sidepanel
      behavior di MV3-Firefox masih quota-limited, kami monitor ecosystem
      dulu.
    </>
  ),
  "apakah-extension-ini-aman-data-saya-dilihat-siapa": (
    <>
      Sangat aman. Kami tidak melihat atau menyimpan: nama, email, nomor
      telepon, alamat, password, payment info, atau browsing history di luar
      marketplace.{" "}
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
  "ingestion-secret-saya-bocor-apa-yang-harus-saya-lakukan": (
    <>
      Karena INGESTION_SECRET adalah token <em>kelas</em> (bukan personal),
      dampaknya minimal: orang lain bisa submit produk atas nama kamu. Cara
      mitigasi:
      <ol className="mt-2 list-decimal space-y-1 pl-5">
        <li>Uninstall extension, bersihkan <code>chrome.storage.local</code></li>
        <li>
          Email <code>privacy@bijakbeli.id</code> dengan subjek
          &quot;secret compromised&quot; — kami akan regenerate dalam &lt; 24 jam
        </li>
        <li>Install ulang extension setelah dapat secret baru</li>
      </ol>
    </>
  ),
  "apakah-extension-mengirim-data-ke-pihak-ketiga": (
    <>
      Tidak. Submission hanya ke server BijakBeli (Supabase + Vercel). Tidak
      ada Google Analytics di extension, tidak ada telemetri ke server
      pihak ketiga. Lihat Section 6 Privacy Policy.
    </>
  ),
  "marketplace-apa-saja-yang-didukung": (
    <>
      Enam marketplace Indonesia terbesar:{" "}
      <strong>
        Shopee, Tokopedia, Lazada, Blibli, Bukalapak, dan TikTok Shop
      </strong>
      . Marketplace lain (Orami, JD.id, Bhinneka) belum di-support. Kami
      menambah marketplace baru dengan hati-hati karena setiap tambahan
      host_permission memerlukan review Chrome.
    </>
  ),
  "kenapa-extension-tidak-scrape-harga-di-halaman-tokopedia-saya": (
    <>
      Sebab umum:
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>
          URL tersebut sebenarnya promo/dynamic-content (popup-inline, modal
          review) — content script skip
        </li>
        <li>
          SPA navigation setelah page-load (Tokopedia sering ganti URL tanpa
          reload) — refresh halaman (F5) biasanya fix
        </li>
        <li>
          Sudah pernah di-submit dalam 1 jam terakhir (deduplication) —
          tunggu 60 menit, atau buka variant produk
        </li>
      </ul>
      Kalau tetap tidak jalan, email kami URL produk + screenshot Console
      output di popup (lihat Troubleshooting).
    </>
  ),
  "akan-mendukung-amazon-ebay-marketplace-luar-negeri": (
    <>
      Belum. Fokus saat ini adalah marketplace Indonesia — kami masih
      mengumpulkan data untuk community-pricing database lokal dulu.
      Tambahkan feature request di GitHub issues.
    </>
  ),
  "saya-tidak-mau-terima-notifikasi-sama-sekali": (
    <>
      Tiga cara:
      <ol className="mt-2 list-decimal space-y-1 pl-5">
        <li>
          Jangan tambahkan produk apapun ke watchlist (default behavior
          setelah install)
        </li>
        <li>
          Buka <code>chrome://extensions</code> → BijakBeli → Site settings →
          ubah Notifications dari &quot;Allow&quot; menjadi &quot;Block&quot;
        </li>
        <li>
          Buka <code>chrome://settings/notifications</code> dan cari BijakBeli,
          set ke &quot;Off&quot;
        </li>
      </ol>
      Tanpa watchlist + notifikasi = privacy seperti extension ini tidak
      terinstall.
    </>
  ),
  "kenapa-notifikasi-tidak-muncul-padahal-harga-sudah-turun": (
    <>
      Cooldown per produk adalah 24 jam — kalau sudah pernah dapat notifikasi
      untuk produk X dalam 24 jam terakhir, tidak akan muncul lagi meskipun
      harga turun lebih jauh. Ini anti-spam. Background worker cek setiap 30
      menit (bukan real-time).
    </>
  ),
};

// English map — covers the entries that benefit from list formatting.
export const ENGLISH_HTML: HtmlMap = {
  "i-installed-the-extension-but-the-popup-only-shows-an-empty-form": (
    <>
      That means the install succeeded. The popup prompts for
      INGESTION_SECRET on first run. Click the &quot;Get
      INGESTION_SECRET&quot; link to open the setup page.
    </>
  ),
  "does-the-extension-work-on-all-browsers": (
    <>
      Currently Chrome 108+ (desktop) plus all Chromium-based browsers (Edge
      108+, Brave 108+, Arc). Firefox &amp; Safari are not yet supported —
      porting the service-worker + sidepanel to MV3-Firefox is quota-limited;
      we&apos;re monitoring.
    </>
  ),
  "is-this-extension-safe-who-sees-my-data": (
    <>
      We never see or store: name, email, phone, address, password, payment
      info, or browsing history outside marketplaces. Full audit in the{" "}
      <Link
        href="/extension/privacy-policy"
        className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
      >
        Privacy Policy
      </Link>
      . Source code is open on GitHub.
    </>
  ),
  "my-ingestion-secret-was-leaked-what-now": (
    <>
      It&apos;s a <em>class</em> token, so impact is minimal: someone else can
      submit products as you. Mitigation: uninstall extension, clear{" "}
      <code>chrome.storage.local</code>, email{" "}
      <code>privacy@bijakbeli.id</code> with &quot;secret compromised&quot;
      (we regenerate within 24h), then reinstall.
    </>
  ),
  "why-doesn-t-the-extension-scrape-prices-on-my-tokopedia-page": (
    <>
      Common causes:
      <ol className="mt-2 list-decimal space-y-1 pl-5">
        <li>the URL is actually dynamic content (popup, modal — content script skips these)</li>
        <li>SPA navigation after page load — hard refresh (Ctrl/Cmd+Shift+R) usually fixes</li>
        <li>deduplication — same URL submitted within 1 hour is silently skipped</li>
      </ol>
    </>
  ),
  "i-don-t-want-to-receive-any-notifications": (
    <>
      Three options:
      <ol className="mt-2 list-decimal space-y-1 pl-5">
        <li>don&apos;t add any product to your watchlist (default behavior)</li>
        <li><code>chrome://extensions</code> → BijakBeli → Site settings → set Notifications to Block</li>
        <li><code>chrome://settings/notifications</code> → find BijakBeli → toggle Off</li>
      </ol>
    </>
  ),
};
