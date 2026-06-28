import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - BijakBeli.app",
  description: "Kebijakan privasi BijakBeli.app mengenai pengumpulan, penggunaan, dan perlindungan data pengguna.",
  alternates: {
    canonical: "/legal/privacy",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">Kebijakan Privasi</h1>
      
      <div className="prose prose-gray max-w-none dark:prose-invert">
        <p className="text-muted-foreground">
          Terakhir diperbarui: 11 Juni 2026
        </p>

        <section className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">1. Informasi yang Kami Kumpulkan</h2>
          
          <h3 className="text-xl font-semibold mt-6 mb-3">1.1 Informasi Akun</h3>
          <p>
            Ketika Anda membuat akun, kami mengumpulkan email, nama, dan password terenkripsi. 
            Data ini digunakan untuk autentikasi dan personalisasi layanan.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">1.2 Data Penggunaan</h3>
          <p>
            Kami mengumpulkan data penggunaan seperti:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Riwayat pencarian produk</li>
            <li>Produk yang ditambahkan ke wishlist</li>
            <li>Price alert yang dibuat</li>
            <li>Ulasan dan rating produk</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-3">1.3 Data Teknis</h3>
          <p>
            Kami mengumpulkan informasi teknis seperti alamat IP, browser, dan device untuk keamanan dan analisis.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">2. Cara Kami Menggunakan Data</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Menyediakan fitur pembanding harga dan price alert</li>
            <li>Mengirim notifikasi email dan push tentang penurunan harga</li>
            <li>Meningkatkan akurasi rekomendasi produk</li>
            <li>Menganalisis tren harga dan pola belanja</li>
            <li>Mencegah fraud dan penyalahgunaan layanan</li>
            <li>Memperbaiki dan mengembangkan fitur baru</li>
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">3. Berbagi Data dengan Pihak Ketiga</h2>
          <p>
            Kami <strong>tidak menjual data pribadi Anda</strong> kepada pihak ketiga. 
            Kami hanya berbagi data dalam kondisi berikut:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2">
            <li>
              <strong>Provider layanan:</strong> Kami menggunakan Supabase untuk database, 
              Resend untuk email, dan layanan cloud untuk hosting.
            </li>
            <li>
              <strong>Affiliate links:</strong> Ketika Anda klik link ke marketplace, 
              kami mungkin menerima komisi affiliate tanpa biaya tambahan untuk Anda.
            </li>
            <li>
              <strong>Kepatuhan hukum:</strong> Jika diwajibkan oleh hukum atau proses hukum yang sah.
            </li>
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">4. Keamanan Data</h2>
          <p>
            Kami menggunakan enkripsi HTTPS, password hashing, Row Level Security (RLS) di database, 
            dan praktik keamanan industri untuk melindungi data Anda. Namun, tidak ada sistem yang 
            100% aman, dan kami mendorong Anda untuk menggunakan password yang kuat dan unik.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">5. Hak Anda</h2>
          <p>Anda memiliki hak untuk:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Mengakses dan mengunduh data pribadi Anda melalui halaman Settings</li>
            <li>Mengedit informasi profil Anda</li>
            <li>Menghapus akun Anda (akan menghapus semua data terkait)</li>
            <li>Berhenti berlangganan email notifikasi kapan saja</li>
            <li>Menonaktifkan push notifications melalui browser</li>
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">6. Cookies dan Tracking</h2>
          <p>
            Kami menggunakan cookies untuk menjaga sesi login dan preferensi pengguna. 
            Kami tidak menggunakan cookies untuk tracking iklan pihak ketiga.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">7. Data Anak-anak</h2>
          <p>
            Layanan kami ditujukan untuk pengguna berusia 13 tahun ke atas. 
            Kami tidak dengan sengaja mengumpulkan data dari anak di bawah usia 13 tahun.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">8. Perubahan Kebijakan</h2>
          <p>
            Kami dapat memperbarui kebijakan privasi ini dari waktu ke waktu. 
            Perubahan signifikan akan kami informasikan melalui email atau notifikasi di aplikasi.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">9. Kontak</h2>
          <p>
            Jika Anda memiliki pertanyaan tentang kebijakan privasi ini, hubungi kami di:
          </p>
          <ul className="list-none mt-2 space-y-1">
            <li>Email: privacy@bijakbeli.id</li>
            <li>Website: bijakbeli-app.vercel.app</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
