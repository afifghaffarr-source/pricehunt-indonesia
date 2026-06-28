export const metadata = {
  title: "Privacy Policy - BijakBeli.app Extension",
  description: "Privacy policy for BijakBeli Chrome Extension — how we collect, store, and use data.",
  alternates: {
    canonical: "/legal#privacy",
  },
};

export default function PrivacyPolicyPage() {
  // Vercel serves a stuck 404 for /extension/* sub-routes added after a
  // certain time. Until that edge-cache flush completes, the canonical
  // privacy policy lives at /legal#privacy (which is in production and
  // publicly reachable). This page is preserved in source so that once
  // the cache flushes, the URL resolves to a real privacy page.

  return (
    <main style={{ padding: "4rem 2rem", maxWidth: "720px", margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      <h1>Privacy Policy</h1>
      <p style={{ marginTop: "1rem" }}>
        Halaman privacy policy BijakBeli Chrome Extension sedang dalam transisi ke URL baru.
      </p>
      <p style={{ marginTop: "1rem" }}>
        Untuk saat ini, lihat policy lengkap di:{" "}
        <a href="https://www.bijakbeli.web.id/legal#privacy" style={{ color: "#2563eb" }}>
          bijakbeli.web.id/legal#privacy
        </a>
      </p>
      <p style={{ marginTop: "2rem", fontSize: "0.9rem", color: "#6b7280" }}>
        Path ini akan aktif dalam 24-48 jam setelah Vercel CDN cache flush.
        Visit extension metadata di <code>manifest.json</code> menggunakan URL temporer di atas.
      </p>
    </main>
  );
}
