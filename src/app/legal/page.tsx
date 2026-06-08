import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legal & Kepercayaan",
  description: "Kebijakan privasi, syarat penggunaan, disclosure afiliasi, disclaimer akurasi harga, dan kontak PriceHunt Indonesia.",
};

const sections = [
  {
    id: "privacy",
    title: "Kebijakan Privasi",
    body: [
      "PriceHunt menggunakan data akun, wishlist, price alert, review, dan preferensi hanya untuk menjalankan fitur yang Anda pilih.",
      "Kami tidak menjual data pribadi pengguna. Data teknis seperti log error dan performa dapat dipakai untuk menjaga keamanan serta stabilitas layanan.",
      "Anda dapat mengekspor data melalui halaman Settings. Penghapusan akun hanya ditampilkan jika backend penghapusan permanen sudah siap.",
    ],
  },
  {
    id: "terms",
    title: "Syarat & Ketentuan",
    body: [
      "PriceHunt membantu membandingkan dan menganalisis harga dari data yang tersedia. Keputusan pembelian tetap menjadi tanggung jawab pengguna.",
      "Jangan menggunakan PriceHunt untuk scraping agresif, penyalahgunaan API, spam review, atau aktivitas yang melanggar hukum dan ketentuan marketplace.",
      "Kami dapat membatasi akses fitur mahal seperti AI advisor jika terdeteksi penggunaan berlebihan atau tidak wajar.",
    ],
  },
  {
    id: "affiliate",
    title: "Affiliate Disclosure",
    body: [
      "Beberapa tautan marketplace dapat berupa tautan afiliasi. Jika Anda membeli melalui tautan tersebut, PriceHunt mungkin menerima komisi tanpa menambah biaya untuk Anda.",
      "Rekomendasi harga dan keputusan beli/tunggu tetap dibuat untuk membantu pengguna memahami data harga, bukan untuk memaksa pembelian tertentu.",
    ],
  },
  {
    id: "accuracy",
    title: "Price Accuracy Disclaimer",
    body: [
      "Harga dapat berubah sewaktu-waktu. PriceHunt membantu membandingkan dan menganalisis data harga, namun keputusan akhir tetap mengikuti harga resmi di marketplace saat checkout.",
      "Analisis seperti deal score, diskon mencurigakan, dan rekomendasi beli/tunggu bersifat indikatif berdasarkan riwayat harga yang tersedia.",
      "Selalu periksa ongkir, voucher, stok, varian, garansi, reputasi seller, dan total pembayaran sebelum checkout.",
    ],
  },
  {
    id: "contact",
    title: "Kontak",
    body: [
      "Untuk pertanyaan privasi, koreksi data harga, kerja sama, atau laporan keamanan, hubungi tim PriceHunt melalui kanal kontak resmi yang akan dicantumkan pada domain production.",
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
            PriceHunt dirancang untuk membantu pembeli Indonesia membandingkan harga dengan lebih cerdas. Halaman ini menjelaskan privasi, syarat penggunaan, disclosure afiliasi, akurasi harga, dan kontak.
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