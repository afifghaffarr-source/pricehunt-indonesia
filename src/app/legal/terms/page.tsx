import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - PriceHunt Indonesia",
  description: "Syarat dan ketentuan penggunaan layanan PriceHunt Indonesia.",
};

export default function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">Syarat dan Ketentuan Layanan</h1>
      
      <div className="prose prose-gray max-w-none dark:prose-invert">
        <p className="text-muted-foreground">
          Terakhir diperbarui: 11 Juni 2026
        </p>

        <section className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">1. Penerimaan Syarat</h2>
          <p>
            Dengan mengakses dan menggunakan PriceHunt Indonesia, Anda setuju untuk terikat dengan 
            syarat dan ketentuan ini. Jika Anda tidak setuju, harap tidak menggunakan layanan kami.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">2. Deskripsi Layanan</h2>
          <p>
            PriceHunt Indonesia adalah platform pembanding harga yang membantu pengguna:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Membandingkan harga produk dari berbagai marketplace Indonesia</li>
            <li>Memantau perubahan harga dan mendapat notifikasi price alert</li>
            <li>Menganalisis tren harga dan mendeteksi diskon palsu</li>
            <li>Mendapatkan rekomendasi kapan waktu terbaik untuk membeli</li>
          </ul>
          <p className="mt-4">
            Layanan kami bersifat <strong>gratis untuk pengguna</strong> dan didukung oleh 
            komisi affiliate dari marketplace.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">3. Akun Pengguna</h2>
          <h3 className="text-xl font-semibold mt-4 mb-2">3.1 Pendaftaran</h3>
          <p>
            Anda bertanggung jawab untuk menjaga kerahasiaan akun dan password Anda. 
            Gunakan password yang kuat dan unik. Anda bertanggung jawab atas semua 
            aktivitas yang terjadi di akun Anda.
          </p>

          <h3 className="text-xl font-semibold mt-4 mb-2">3.2 Informasi Akurat</h3>
          <p>
            Anda setuju untuk memberikan informasi yang akurat, terkini, dan lengkap saat pendaftaran.
          </p>

          <h3 className="text-xl font-semibold mt-4 mb-2">3.3 Usia Minimum</h3>
          <p>
            Anda harus berusia minimal 13 tahun untuk menggunakan layanan ini.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">4. Akurasi Data Harga</h2>
          <p className="font-semibold text-orange-600 dark:text-orange-400">
            PENTING: Harga dapat berubah sewaktu-waktu.
          </p>
          <p className="mt-2">
            Kami berusaha menyediakan informasi harga yang akurat dan terkini dengan mengumpulkan 
            data dari berbagai marketplace. Namun:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2">
            <li>
              <strong>Harga bisa berubah kapan saja</strong> tanpa pemberitahuan sebelumnya oleh marketplace.
            </li>
            <li>
              Data harga di PriceHunt adalah <strong>referensi</strong> dan mungkin berbeda dengan 
              harga aktual saat checkout.
            </li>
            <li>
              <strong>Harga final yang berlaku adalah harga di marketplace</strong> saat Anda melakukan transaksi.
            </li>
            <li>
              Kami tidak bertanggung jawab atas perbedaan harga, ketersediaan stok, atau perubahan 
              promosi yang terjadi di marketplace.
            </li>
          </ul>
          <p className="mt-4">
            <strong>Selalu cek harga final di marketplace sebelum membeli.</strong>
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">5. Affiliate Disclosure</h2>
          <p>
            PriceHunt Indonesia adalah peserta dalam program affiliate dari berbagai marketplace Indonesia. 
            Ketika Anda mengklik link produk dan melakukan pembelian, kami mungkin menerima komisi affiliate 
            <strong> tanpa biaya tambahan untuk Anda</strong>.
          </p>
          <p className="mt-2">
            Komisi ini membantu kami menjaga layanan tetap gratis untuk pengguna. Kami berkomitmen untuk 
            memberikan informasi yang objektif dan tidak bias, terlepas dari komisi yang kami terima.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">6. Larangan Penggunaan</h2>
          <p>Anda <strong>tidak diperbolehkan</strong> untuk:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Menggunakan layanan untuk tujuan ilegal atau penipuan</li>
            <li>Melakukan scraping atau crawling secara berlebihan yang mengganggu sistem</li>
            <li>Menyalahgunakan fitur price alert atau notifikasi (spam)</li>
            <li>Mencoba mengakses akun pengguna lain tanpa izin</li>
            <li>Mengirim virus, malware, atau kode berbahaya</li>
            <li>Memanipulasi atau merusak data harga</li>
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">7. Konten Pengguna (Ulasan)</h2>
          <p>
            Anda dapat memberikan ulasan produk di platform kami. Dengan mengirim ulasan, Anda setuju bahwa:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Ulasan Anda jujur dan berdasarkan pengalaman pribadi</li>
            <li>Anda memberikan hak kepada kami untuk menampilkan ulasan tersebut</li>
            <li>Kami berhak menghapus ulasan yang melanggar ketentuan atau mengandung spam</li>
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">8. Intellectual Property</h2>
          <p>
            Semua konten di PriceHunt Indonesia, termasuk teks, grafik, logo, dan software, 
            adalah milik kami atau pemberi lisensi kami dan dilindungi oleh hak cipta.
          </p>
          <p className="mt-2">
            Data harga dan informasi produk yang kami kumpulkan dari marketplace tetap menjadi 
            milik marketplace masing-masing.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">9. Disclaimer dan Batasan Tanggung Jawab</h2>
          
          <h3 className="text-xl font-semibold mt-4 mb-2">9.1 "AS IS" Basis</h3>
          <p>
            Layanan disediakan <strong>"sebagaimana adanya"</strong> tanpa jaminan apapun, 
            baik tersurat maupun tersirat.
          </p>

          <h3 className="text-xl font-semibold mt-4 mb-2">9.2 No Warranty</h3>
          <p>
            Kami tidak menjamin:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Akurasi 100% dari data harga</li>
            <li>Ketersediaan layanan tanpa gangguan</li>
            <li>Keamanan 100% dari bug atau error</li>
          </ul>

          <h3 className="text-xl font-semibold mt-4 mb-2">9.3 Batasan Tanggung Jawab</h3>
          <p>
            <strong>Kami tidak bertanggung jawab</strong> atas:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Kerugian finansial akibat perbedaan harga</li>
            <li>Keputusan pembelian yang dibuat berdasarkan rekomendasi kami</li>
            <li>Masalah transaksi, pengiriman, atau layanan di marketplace</li>
            <li>Kehilangan data atau gangguan layanan</li>
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">10. Perubahan Layanan</h2>
          <p>
            Kami berhak untuk mengubah, menangguhkan, atau menghentikan layanan atau fitur 
            kapan saja tanpa pemberitahuan sebelumnya.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">11. Pemutusan Akun</h2>
          <p>
            Kami berhak menangguhkan atau menghapus akun Anda jika Anda melanggar syarat ini 
            atau menggunakan layanan secara tidak pantas.
          </p>
          <p className="mt-2">
            Anda dapat menghapus akun Anda sendiri melalui halaman Settings kapan saja.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">12. Hukum yang Berlaku</h2>
          <p>
            Syarat dan ketentuan ini diatur oleh hukum Republik Indonesia. 
            Setiap sengketa akan diselesaikan di pengadilan yang berwenang di Indonesia.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">13. Perubahan Syarat</h2>
          <p>
            Kami dapat memperbarui syarat dan ketentuan ini dari waktu ke waktu. 
            Dengan terus menggunakan layanan setelah perubahan, Anda setuju dengan syarat yang baru.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">14. Kontak</h2>
          <p>
            Jika Anda memiliki pertanyaan tentang syarat dan ketentuan ini:
          </p>
          <ul className="list-none mt-2 space-y-1">
            <li>Email: legal@pricehunt.id</li>
            <li>Website: pricehunt-indonesia.vercel.app</li>
          </ul>
        </section>

        <div className="mt-12 rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-900 dark:bg-blue-950/20">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Ringkasan Penting
          </h3>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>✓ Layanan gratis untuk pengguna, didukung affiliate</li>
            <li>✓ Harga bisa berubah, selalu cek marketplace sebelum beli</li>
            <li>✓ Kami tidak bertanggung jawab atas transaksi di marketplace</li>
            <li>✓ Gunakan layanan secara bertanggung jawab</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
