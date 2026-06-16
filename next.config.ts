import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

// CSP is more restrictive in production: drop 'unsafe-eval' (only needed
// for Next.js dev HMR / Webpack). 'unsafe-inline' stays for Next.js
// streamed inline scripts in production (the framework emits them and
// there is no first-party nonce pipeline wired in yet — see TODO below).
const cspDirectives = [
  "default-src 'self'",
  isProduction
    ? "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com https://vercel.live"
    : "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com https://vercel.live",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https://placehold.co https://images.unsplash.com https://picsum.photos https://fastly.picsum.photos https://images.tokopedia.net https://p16-images-sign-sg.tokopedia-static.net https://p19-images-sign-sg.tokopedia-static.net https://cf.shopee.co.id https://s-cf-id.shopeesz.com https://s.bukalapak.com https://www.static-src.com https://img.lazcdn.com https://i5.walmartimages.com https://p16-oec-sg.tiktokcdn.com data: blob:",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co https://vitals.vercel-insights.com wss://*.supabase.co https://vercel.live",
  "frame-src 'none'",
  // Block mixed content and restrict framing further.
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  // Upgrade insecure requests (only meaningful when served over HTTPS).
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
];

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  // Modern browsers ignore X-XSS-Protection; setting it can introduce
  // regressions. Keep it for legacy browsers but rely on CSP for real
  // XSS defense.
  { key: "X-XSS-Protection", value: "0" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  // Cross-origin isolation (defense-in-depth against side-channel attacks).
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  // COEP uses `credentialless` (not `require-corp`) so that cross-origin
  // marketplace <img> tags keep loading without us needing to ship
  // CORP headers on those third parties.
  { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
  // HSTS only in production — local dev is HTTP.
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
  {
    key: "Content-Security-Policy",
    value: cspDirectives.join("; "),
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      // Marketplace image domains
      { protocol: "https", hostname: "images.tokopedia.net" },
      { protocol: "https", hostname: "p16-images-sign-sg.tokopedia-static.net" },
      { protocol: "https", hostname: "p19-images-sign-sg.tokopedia-static.net" },
      { protocol: "https", hostname: "cf.shopee.co.id" },
      { protocol: "https", hostname: "s-cf-id.shopeesz.com" },
      { protocol: "https", hostname: "s.bukalapak.com" },
      { protocol: "https", hostname: "www.static-src.com" },
      { protocol: "https", hostname: "img.lazcdn.com" },
      { protocol: "https", hostname: "i5.walmartimages.com" },
      { protocol: "https", hostname: "p16-oec-sg.tiktokcdn.com" },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {
    root: __dirname,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "framer-motion"],
  },
  // Consolidate all hosts onto the canonical www.bijakbeli.web.id.
  // - apex (bijakbeli.web.id)            → www
  // - any Vercel deployment of the project → www
  // - legacy DEFAULT_APP_URL alias       → www
  // The Vercel host regex matches any preview URL for this project
  // (e.g. pricehunt-indonesia-<hash>-<owner>.vercel.app).
  async redirects() {
    const canonicalHost = "www.bijakbeli.web.id";
    const vercelHostPattern =
      "(pricehunt-indonesia[^.]*\\.vercel\\.app|bijakbeli-app\\.vercel\\.app)";

    return [
      // Apex domain → www (308 permanent)
      {
        source: "/:path*",
        has: [{ type: "host", value: "bijakbeli.web.id" }],
        destination: `https://${canonicalHost}/:path*`,
        permanent: true,
      },
      // Vercel project deployment URL → www (308 permanent).
      // Covers both the explicit `bijakbeli-app` alias and the
      // auto-generated `pricehunt-indonesia-<hash>-<owner>.vercel.app`.
      {
        source: "/:path*",
        has: [{ type: "host", value: vercelHostPattern }],
        destination: `https://${canonicalHost}/:path*`,
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      // ⚠️ REMOVED: Global API cache was dangerous for private endpoints
      // Individual API routes now set their own appropriate cache headers
      // Private routes (user data, admin, alerts) use Cache-Control: no-store
      // Public routes (trending, public search) can set public cache if needed
    ];
  },
};

export default nextConfig;
