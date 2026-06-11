import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legal & Kepercayaan",
  description: "Kebijakan privasi, syarat penggunaan, disclosure afiliasi, disclaimer akurasi harga, dan kontak BijakBeli.app.",
};

const sections = [
  {
    id: "privacy",
    title: "Kebijakan Privasi",
    body: [
      "Data yang Kami Kumpulkan: BijakBeli mengumpulkan data akun (email, nama tampilan), wishlist produk, price alert, review, preferensi notifikasi, dan riwayat pencarian untuk menjalankan fitur yang Anda pilih. Kami juga mengumpulkan data teknis seperti IP address, user agent, dan log error untuk keamanan dan stabilitas layanan.",
      "Penggunaan Data: Data Anda digunakan untuk menyediakan fitur perbandingan harga, notifikasi price alert, rekomendasi belanja, dan email digest mingguan (jika Anda mengaktifkan). Kami tidak menjual atau membagikan data pribadi Anda kepada pihak ketiga untuk tujuan marketing.",
      "Layanan Pihak Ketiga: Kami menggunakan Supabase (database & auth), Resend (email), dan OpenAI (AI advisor). Data Anda yang dikirim ke layanan ini tunduk pada kebijakan privasi masing-masing provider. Kami tidak mengirim data sensitif atau informasi pembayaran ke AI provider.",
      "Cookies & Local Storage: Kami menggunakan cookies untuk menjaga session login dan preferensi tampilan. Extension browser menyimpan data lokal untuk cache hasil pencarian. Anda dapat menghapus cookies melalui pengaturan browser.",
      "Hak Anda: Anda berhak mengakses, mengoreksi, dan mengekspor data pribadi Anda melalui halaman Settings. Anda dapat menonaktifkan notifikasi dan email digest kapan saja. Penghapusan akun permanen akan tersedia saat backend penghapusan data siap (saat ini dalam pengembangan).",
      "Retensi Data: Data akun dan wishlist disimpan selama akun aktif. Price alert yang sudah triggered disimpan 90 hari. Review disimpan permanen kecuali Anda menghapusnya. Log teknis disimpan maksimal 30 hari.",
      "Keamanan: Kami menggunakan enkripsi HTTPS untuk semua komunikasi, Row Level Security (RLS) untuk database, dan rate limiting untuk melindungi dari penyalahgunaan. Namun, tidak ada sistem yang 100% aman. Jangan bagikan kredensial login Anda.",
    ],
  },
  {
    id: "terms",
    title: "Syarat & Ketentuan",
    body: [
      "Penggunaan Layanan: BijakBeli membantu membandingkan dan menganalisis harga dari data yang tersedia. Kami menyediakan informasi, rekomendasi, dan tools untuk membantu keputusan belanja. Keputusan pembelian akhir tetap menjadi tanggung jawab Anda.",
      "Akun & Keamanan: Anda bertanggung jawab menjaga kerahasiaan kredensial login. Jangan bagikan akun atau gunakan akun orang lain tanpa izin. Laporkan aktivitas mencurigakan segera. Kami berhak menangguhkan akun yang terindikasi melanggar ketentuan.",
      "Penggunaan yang Dilarang: Jangan menggunakan BijakBeli untuk scraping agresif, penyalahgunaan API, spam review palsu, manipulasi rating, distributed attacks, atau aktivitas yang melanggar hukum dan ketentuan marketplace. Jangan mengirim malware, virus, atau kode berbahaya.",
      "Rate Limiting: Kami menerapkan rate limiting untuk melindungi infrastruktur dan biaya operasional. Fitur mahal seperti AI advisor dibatasi per user per hari. Penggunaan berlebihan atau tidak wajar dapat menyebabkan pembatasan sementara atau permanen.",
      "Hak Kekayaan Intelektual: Konten BijakBeli (desain, code, branding, copy) dilindungi hak cipta. Data harga marketplace adalah milik marketplace terkait. Anda boleh menggunakan BijakBeli untuk keperluan pribadi, tidak untuk redistribusi komersial tanpa izin.",
      "Batasan Tanggung Jawab: BijakBeli disediakan 'as is' tanpa garansi ketersediaan 100%. Kami tidak bertanggung jawab atas kerugian finansial akibat keputusan pembelian, downtime layanan, kesalahan data harga, atau kehilangan data akibat force majeure. Tanggung jawab kami terbatas pada biaya langganan yang Anda bayarkan (jika ada).",
      "Perubahan Layanan: Kami berhak menambah, mengubah, atau menghentikan fitur tanpa pemberitahuan sebelumnya. Perubahan signifikan akan diumumkan melalui email atau notifikasi di platform. Penggunaan berkelanjutan setelah perubahan berarti Anda menyetujui ketentuan baru.",
      "Hukum yang Berlaku: Syarat ini tunduk pada hukum Indonesia. Sengketa akan diselesaikan secara musyawarah terlebih dahulu. Jika tidak tercapai, akan dibawa ke pengadilan yang berwenang di Indonesia.",
    ],
  },
  {
    id: "affiliate",
    title: "Affiliate Disclosure",
    body: [
      "Beberapa tautan marketplace dapat berupa tautan afiliasi. Jika Anda membeli melalui tautan tersebut, BijakBeli mungkin menerima komisi tanpa menambah biaya untuk Anda.",
      "Rekomendasi harga dan keputusan beli/tunggu tetap dibuat untuk membantu pengguna memahami data harga, bukan untuk memaksa pembelian tertentu.",
    ],
  },
  {
    id: "accuracy",
    title: "Price Accuracy Disclaimer",
    body: [
      "Harga dapat berubah sewaktu-waktu. BijakBeli membantu membandingkan dan menganalisis data harga, namun keputusan akhir tetap mengikuti harga resmi di marketplace saat checkout.",
      "Analisis seperti deal score, diskon mencurigakan, dan rekomendasi beli/tunggu bersifat indikatif berdasarkan riwayat harga yang tersedia.",
      "Selalu periksa ongkir, voucher, stok, varian, garansi, reputasi seller, dan total pembayaran sebelum checkout.",
    ],
  },
  {
    id: "contact",
    title: "Kontak",
    body: [
      "Untuk pertanyaan privasi, koreksi data harga, kerja sama, atau laporan keamanan, hubungi tim BijakBeli melalui kanal kontak resmi yang akan dicantumkan pada domain production.",
      "Saat kanal email khusus belum tersedia, gunakan repository atau dashboard project internal untuk pelaporan teknis.",
    ],
  },
];

export default function LegalPage() {
  return (
    <div className="bg-gradient-to-b from-background via-muted/30 to-background">
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border bg-background/90 p-6 shadow-sm sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Legal & trust</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
            Aturan main yang jelas untuk belanja lebih tenang.
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
            BijakBeli dirancang untuk membantu pembeli Indonesia membandingkan harga dengan lebih cerdas. Halaman ini menjelaskan privasi, syarat penggunaan, disclosure afiliasi, akurasi harga, dan kontak.
          </p>
        </div>

        <nav className="mt-8 flex flex-wrap gap-3" aria-label="Navigasi legal">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="rounded-full border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition hover:border-primary hover:text-foreground"
            >
              {section.title}
            </a>
          ))}
        </nav>

        <div className="mt-8 space-y-6">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24 rounded-3xl border bg-background p-6 shadow-sm">
              <h2 className="text-2xl font-semibold tracking-tight">{section.title}</h2>
              <div className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground sm:text-base">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}