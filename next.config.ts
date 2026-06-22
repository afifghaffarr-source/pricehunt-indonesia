import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const isProduction = process.env.NODE_ENV === "production";

// Content-Security-Policy is now generated per-request in src/proxy.ts.
// The middleware (Node.js runtime) decides per-route:
//   - Static (prerendered) routes: hash-based CSP (SHA-256 of every inline
//     <script> block, extracted at build time by scripts/extract-csp-hashes.mjs)
//   - Dynamic (server-rendered) routes: per-request nonce + 'strict-dynamic'
// The static CSP here only covers directives that don't need per-route logic
// (img-src, font-src, connect-src, frame-ancestors, base-uri, etc.) — these
// are the same for every page.
//
// Why split: see scripts/extract-csp-hashes.mjs and the v1.5.25 CHANGELOG
// entry for the full architectural rationale. The short version is that
// nonce-based CSP requires every page to be dynamically rendered, which we
// don't want for `/auth/*`, `/legal/*`, and other static routes.
//
// All other security headers (HSTS, X-Frame-Options, etc.) stay here.

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
  // Content-Security-Policy is generated per-request in src/proxy.ts:
  //   - Static routes: hash-based (SHA-256 of inline scripts from build)
  //   - Dynamic routes: per-request nonce + 'strict-dynamic'
  // Other security headers (HSTS, X-Frame-Options, Permissions-Policy,
  // COOP/COEP/CORP) stay here — they're identical for every page.
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

// Only wrap with Sentry when DSN is configured.
// Sentry is a no-op without DSN, but the wrapper adds bundle size — skip when unused.
const sentryEnabled = Boolean(
  process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN
);

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      silent: !isProduction,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      widenClientFileUpload: true,
      disableLogger: true,
    })
  : nextConfig;
