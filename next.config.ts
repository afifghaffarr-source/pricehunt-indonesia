import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com https://vercel.live",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' https://placehold.co https://images.unsplash.com https://images.tokopedia.net https://cf.shopee.co.id https://s-cf-id.shopeesz.com https://s.bukalapak.com https://www.static-src.com https://img.lazcdn.com https://p16-oec-sg.tiktokcdn.com data: blob:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co https://vitals.vercel-insights.com wss://*.supabase.co https://vercel.live",
      "frame-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      // Marketplace image domains
      { protocol: "https", hostname: "images.tokopedia.net" },
      { protocol: "https", hostname: "cf.shopee.co.id" },
      { protocol: "https", hostname: "s-cf-id.shopeesz.com" },
      { protocol: "https", hostname: "s.bukalapak.com" },
      { protocol: "https", hostname: "www.static-src.com" },
      { protocol: "https", hostname: "img.lazcdn.com" },
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
