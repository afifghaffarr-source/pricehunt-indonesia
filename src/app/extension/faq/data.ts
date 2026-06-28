/**
 * Plain-text FAQ data (no JSX). Single source of truth for server-side
 * JSON-LD generation + the /extension/faq.json endpoint + Playwright
 * assertions. JSX-rendered HTML lives in ./html.tsx and is wired in by
 * the page component.
 *
 * Adding a new question: append to BAHASA + EN entries below, then mirror
 * the rich-text HTML into html.tsx (keyed by `id`).
 */

export type Locale = "id" | "en";

export interface FAQEntry {
  id: string;
  q: string;
  a: string;
  group: string;
}

// Stable slugify — must match html.tsx keys and <details id={id}>.
function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export const BAHASA_FAQ: FAQEntry[] = [
  {
    id: slugify("Apa itu INGESTION_SECRET dan bagaimana cara mendapatkannya?"),
    q: "Apa itu INGESTION_SECRET dan bagaimana cara mendapatkannya?",
    a:
      "INGESTION_SECRET adalah token bersama yang mengautentikasi submission produk extension ke database BijakBeli. Dapatkan di halaman setup (lihat /extension/setup). Untuk saat ini hanya tersedia untuk beta tester yang sudah terdaftar. Setelah aplikasi dibuka untuk umum (Q3 2026), token akan otomatis ter-generate saat kamu sign up.",
    group: "Setup & Installation",
  },
  {
    id: slugify("Saya install extension tapi popup cuma nampilin form kosong."),
    q: "Saya install extension tapi popup cuma nampilin form kosong.",
    a:
      "Itu artinya extension berhasil terinstall dan siap pakai. Popup cuma menampilkan form INGESTION_SECRET untuk setup awal. Kalau kamu belum punya secret, klik link \"Dapatkan INGESTION_SECRET\" di popup untuk masuk ke halaman setup.",
    group: "Setup & Installation",
  },
  {
    id: slugify("Apakah extension jalan di semua browser?"),
    q: "Apakah extension jalan di semua browser?",
    a:
      "Saat ini hanya Chrome (desktop, Chrome 108+) dan semua browser Chromium-based (Edge 108+, Brave 108+, Arc, dll). Firefox & Safari belum didukung — code base extension bisa di-port tapi sidepanel behavior di MV3-Firefox masih quota-limited, kami monitor ecosystem dulu.",
    group: "Setup & Installation",
  },
  {
    id: slugify("Apakah extension ini aman? Data saya dilihat siapa?"),
    q: "Apakah extension ini aman? Data saya dilihat siapa?",
    a:
      "Sangat aman. Kami tidak melihat atau menyimpan: nama, email, nomor telepon, alamat, password, payment info, atau browsing history di luar marketplace. 142 baris audit penuh ada di Privacy Policy. Source code terbuka di GitHub — bisa di-review siapa saja.",
    group: "Privacy & Keamanan",
  },
  {
    id: slugify("INGESTION_SECRET saya bocor. Apa yang harus saya lakukan?"),
    q: "INGESTION_SECRET saya bocor. Apa yang harus saya lakukan?",
    a:
      "Karena INGESTION_SECRET adalah token kelas (bukan personal), dampaknya minimal: orang lain bisa submit produk atas nama kamu. Cara mitigasi: 1) Uninstall extension, bersihkan chrome.storage.local; 2) Email privacy@bijakbeli.id dengan subjek \"secret compromised\" — kami akan regenerate dalam < 24 jam; 3) Install ulang extension setelah dapat secret baru.",
    group: "Privacy & Keamanan",
  },
  {
    id: slugify("Apakah extension mengirim data ke pihak ketiga?"),
    q: "Apakah extension mengirim data ke pihak ketiga?",
    a:
      "Tidak. Submission hanya ke server BijakBeli (Supabase + Vercel). Tidak ada Google Analytics di extension, tidak ada telemetri ke server pihak ketiga. Lihat Section 6 Privacy Policy.",
    group: "Privacy & Keamanan",
  },
  {
    id: slugify("Marketplace apa saja yang didukung?"),
    q: "Marketplace apa saja yang didukung?",
    a:
      "Enam marketplace Indonesia terbesar: Shopee, Tokopedia, Lazada, Blibli, Bukalapak, dan TikTok Shop. Marketplace lain (Orami, JD.id, Bhinneka) belum di-support. Kami menambah marketplace baru dengan hati-hati karena setiap tambahan host_permission memerlukan review Chrome.",
    group: "Marketplace Support",
  },
  {
    id: slugify("Kenapa extension tidak scrape harga di halaman Tokopedia saya?"),
    q: "Kenapa extension tidak scrape harga di halaman Tokopedia saya?",
    a:
      "Sebab umum: URL tersebut sebenarnya promo/dynamic-content (popup-inline, modal review) — content script skip; SPA navigation setelah page-load (Tokopedia sering ganti URL tanpa reload) — refresh halaman (F5) biasanya fix; Sudah pernah di-submit dalam 1 jam terakhir (deduplication) — tunggu 60 menit, atau buka variant produk. Kalau tetap tidak jalan, email kami URL produk + screenshot Console output di popup.",
    group: "Marketplace Support",
  },
  {
    id: slugify("Akan mendukung Amazon / eBay / marketplace luar negeri?"),
    q: "Akan mendukung Amazon / eBay / marketplace luar negeri?",
    a:
      "Belum. Fokus saat ini adalah marketplace Indonesia — kami masih mengumpulkan data untuk community-pricing database lokal dulu. Tambahkan feature request di GitHub issues.",
    group: "Marketplace Support",
  },
  {
    id: slugify("Saya tidak mau terima notifikasi sama sekali."),
    q: "Saya tidak mau terima notifikasi sama sekali.",
    a:
      "Tiga cara: 1) Jangan tambahkan produk apapun ke watchlist (default behavior setelah install); 2) Buka chrome://extensions → BijakBeli → Site settings → ubah Notifications dari \"Allow\" menjadi \"Block\"; 3) Buka chrome://settings/notifications dan cari BijakBeli, set ke \"Off\". Tanpa watchlist + notifikasi = privacy seperti extension ini tidak terinstall.",
    group: "Notifikasi & Watchlist",
  },
  {
    id: slugify("Kenapa notifikasi tidak muncul padahal harga sudah turun?"),
    q: "Kenapa notifikasi tidak muncul padahal harga sudah turun?",
    a:
      "Cooldown per produk adalah 24 jam — kalau sudah pernah dapat notifikasi untuk produk X dalam 24 jam terakhir, tidak akan muncul lagi meskipun harga turun lebih jauh. Ini anti-spam. Background worker cek setiap 30 menit (bukan real-time).",
    group: "Notifikasi & Watchlist",
  },
];

export const ENGLISH_FAQ: FAQEntry[] = [
  {
    id: slugify("What is INGESTION_SECRET and how do I get one?"),
    q: "What is INGESTION_SECRET and how do I get one?",
    a:
      "A shared authentication token for product submissions to the BijakBeli database. Currently issued to enrolled beta testers (see /extension/setup). Public sign-up opens Q3 2026.",
    group: "Setup & Installation",
  },
  {
    id: slugify("I installed the extension but the popup only shows an empty form."),
    q: "I installed the extension but the popup only shows an empty form.",
    a:
      "That means the install succeeded. The popup prompts for INGESTION_SECRET on first run. Click the \"Get INGESTION_SECRET\" link to open the setup page.",
    group: "Setup & Installation",
  },
  {
    id: slugify("Does the extension work on all browsers?"),
    q: "Does the extension work on all browsers?",
    a:
      "Currently Chrome 108+ (desktop) plus all Chromium-based browsers (Edge 108+, Brave 108+, Arc). Firefox & Safari are not yet supported — porting the service-worker + sidepanel to MV3-Firefox is quota-limited; we're monitoring.",
    group: "Setup & Installation",
  },
  {
    id: slugify("Is this extension safe? Who sees my data?"),
    q: "Is this extension safe? Who sees my data?",
    a:
      "We never see or store: name, email, phone, address, password, payment info, or browsing history outside marketplaces. Full audit in the Privacy Policy. Source code is open on GitHub.",
    group: "Privacy & Security",
  },
  {
    id: slugify("My INGESTION_SECRET was leaked. What now?"),
    q: "My INGESTION_SECRET was leaked. What now?",
    a:
      "It's a class token, so impact is minimal: someone else can submit products as you. Mitigation: uninstall extension, clear chrome.storage.local, email privacy@bijakbeli.id with 'secret compromised' (we regenerate within 24h), then reinstall.",
    group: "Privacy & Security",
  },
  {
    id: slugify("Does the extension send data to third parties?"),
    q: "Does the extension send data to third parties?",
    a:
      "No. Submissions only to BijakBeli servers (Supabase + Vercel). No Google Analytics in the extension, no third-party telemetry.",
    group: "Privacy & Security",
  },
  {
    id: slugify("Which marketplaces are supported?"),
    q: "Which marketplaces are supported?",
    a:
      "Six major Indonesian marketplaces: Shopee, Tokopedia, Lazada, Blibli, Bukalapak, TikTok Shop. Others (Orami, JD.id, Bhnineka) are not yet supported — adding a marketplace requires Chrome CWS review.",
    group: "Marketplace Support",
  },
  {
    id: slugify("Why doesn't the extension scrape prices on my Tokopedia page?"),
    q: "Why doesn't the extension scrape prices on my Tokopedia page?",
    a:
      "Common causes: (1) the URL is actually dynamic content (popup, modal — content script skips these); (2) SPA navigation after page load — hard refresh (Ctrl/Cmd+Shift+R) usually fixes; (3) deduplication — same URL submitted within 1 hour is silently skipped.",
    group: "Marketplace Support",
  },
  {
    id: slugify("Will you support Amazon/eBay/non-Indonesian marketplaces?"),
    q: "Will you support Amazon/eBay/non-Indonesian marketplaces?",
    a:
      "Not yet. Focus is Indonesian marketplaces for the community-pricing database. Open a GitHub issue for a feature request.",
    group: "Marketplace Support",
  },
  {
    id: slugify("I don't want to receive any notifications."),
    q: "I don't want to receive any notifications.",
    a:
      "Three options: (1) don't add any product to your watchlist (default behavior); (2) chrome://extensions → BijakBeli → Site settings → set Notifications to Block; (3) chrome://settings/notifications → find BijakBeli → toggle Off.",
    group: "Notifications & Watchlist",
  },
  {
    id: slugify("Why isn't a notification firing even though the price dropped?"),
    q: "Why isn't a notification firing even though the price dropped?",
    a:
      "Per-product cooldown is 24 hours. If you already received a notification for product X in the last 24h, none will fire even if the price drops further (anti-spam). Background worker checks every 30 minutes.",
    group: "Notifications & Watchlist",
  },
];

// Group ordering — must match page.tsx section iteration order.
export const BAHASA_GROUP_ORDER = [
  "Setup & Installation",
  "Privacy & Keamanan",
  "Marketplace Support",
  "Notifikasi & Watchlist",
] as const;

export const ENGLISH_GROUP_ORDER = [
  "Setup & Installation",
  "Privacy & Security",
  "Marketplace Support",
  "Notifications & Watchlist",
] as const;

// Total questions shown on the page + count metric
export const TOTAL_PERTANYAAN = BAHASA_FAQ.length + ENGLISH_FAQ.length;
