import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL || "https://www.bijakbeli.web.id",
  "http://localhost:3000", // Development
  "http://localhost:3001", // Alternative dev port
];

// Chrome extension pattern (for BijakBeli extension)
const EXTENSION_ORIGIN_PATTERN = /^chrome-extension:\/\/[a-z]+$/;

// Paths that require CSRF protection
//
// /api/admin/* is fully covered — admin guard in handlers does the auth
// check, but CSRF here ensures cross-site forgeries can't even reach
// the admin handlers.
const CSRF_PROTECTED_PATHS = [
  "/api/admin",
  "/api/ai-advisor",
  "/api/vexo/ai",
  "/api/ingestion",
  "/api/ingestion/offer-snapshot",
  "/api/recheck-request",
  "/api/price-report",
  "/api/reviews",
  "/api/push/subscribe",
];

const CSRF_HEADER = "x-csrf-token";
const CSRF_COOKIE = "csrf-token";
const CSRF_HEADER_ALT = "x-csrf";
const CSRF_COOKIE_ALT = "__Host-csrf";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;

  // Check exact matches
  if (ALLOWED_ORIGINS.includes(origin)) return true;

  // Check extension pattern
  if (EXTENSION_ORIGIN_PATTERN.test(origin)) return true;

  // Allow Vercel preview deployments
  if (origin.endsWith(".vercel.app")) return true;

  return false;
}

function addCorsHeaders(response: NextResponse, origin: string | null) {
  if (origin && isAllowedOrigin(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS",
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-CSRF-Token, X-CSRF, X-Requested-With",
    );
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Max-Age", "86400"); // 24 hours
  }

  return response;
}

/**
 * Constant-time string comparison (length-tolerant via early bail).
 * Falls back to plain !== if subtle isn't available (it always is in
 * the Vercel edge runtime, but we keep the fallback for safety).
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Decide whether a request to a CSRF-protected path is allowed.
 *
 * Order of precedence:
 * 1. INGESTION_SECRET bearer (service-to-service, e.g. Python collector).
 * 2. CRON_SECRET bearer (Vercel cron).
 * 3. Same-origin request (Origin matches ALLOWED_ORIGINS) — allowed,
 *    provided a CSRF header AND cookie are present AND match.
 * 4. Extension origin — only allowed if CSRF header + cookie both exist
 *    and match (the extension has access to the cookie).
 * 5. Anything else: 403.
 */
function checkCsrf(
  request: NextRequest,
  pathname: string,
): NextResponse | null {
  // Allow Python collector and cron via service secret.
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const expectedIngestion = process.env.INGESTION_SECRET;
    if (expectedIngestion) {
      const token = authHeader.replace(/^Bearer\s+/i, "");
      if (safeEqual(token, expectedIngestion)) return null;
    }
    const expectedCron = process.env.CRON_SECRET;
    if (expectedCron) {
      const token = authHeader.replace(/^Bearer\s+/i, "");
      if (safeEqual(token, expectedCron)) return null;
    }
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const csrfHeader =
    request.headers.get(CSRF_HEADER) ??
    request.headers.get(CSRF_HEADER_ALT) ??
    "";
  const csrfCookie =
    request.cookies.get(CSRF_COOKIE)?.value ??
    request.cookies.get(CSRF_COOKIE_ALT)?.value ??
    "";

  // The header and cookie must BOTH be present, AND must match.
  // This is a real double-submit check, not just "header exists".
  if (!csrfHeader || !csrfCookie) {
    return NextResponse.json(
      { error: "CSRF token missing" },
      { status: 403 },
    );
  }
  if (!safeEqual(csrfHeader, csrfCookie)) {
    return NextResponse.json(
      { error: "CSRF token mismatch" },
      { status: 403 },
    );
  }

  // Origin enforcement: must be an allowed origin or a same-origin referer.
  if (origin) {
    if (isAllowedOrigin(origin)) return null;
  } else if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (isAllowedOrigin(refOrigin)) return null;
    } catch {
      // fall through
    }
  }

  // Token passed double-submit, but we couldn't confirm origin.
  // For /api/admin we want strictness: reject.
  if (pathname.startsWith("/api/admin")) {
    return NextResponse.json(
      { error: "Untrusted origin for admin endpoint" },
      { status: 403 },
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// CSP + nonce
// ---------------------------------------------------------------------------
//
// We generate a fresh nonce per request and (1) set it as a request header
// so downstream server components can attach it to their own inline
// <script>/<style> tags, and (2) bake it into the Content-Security-Policy
// response header. Next.js also reads `x-nonce` from the incoming request
// and applies it to framework-emitted inline scripts/styles automatically.
//
// We pair the nonce with `'strict-dynamic'` so scripts loaded via a trusted
// (nonced) initial script can transitively load further scripts without
// needing an explicit allowlist — the modern CSP pattern that lets us drop
// `'unsafe-inline'` and `'unsafe-eval'` from production script-src.

function generateNonce(): string {
  // Base64 so the value survives header transport without quoting issues.
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

function buildCsp(nonce: string, isProduction: boolean): string {
  // In dev, Webpack/Turbopack HMR needs `'unsafe-eval'`. In prod, drop it.
  const scriptSrc = isProduction
    ? `'self' 'nonce-${nonce}' 'strict-dynamic' https://va.vercel-scripts.com https://vercel.live`
    : `'self' 'nonce-${nonce}' 'unsafe-eval' 'strict-dynamic' https://va.vercel-scripts.com https://vercel.live`;

  // Drop `'unsafe-inline'` from style-src — Tailwind/Emotion emit hashed or
  // nonced inline styles in the App Router. If a third-party style snippet
  // ever needs to bypass, switch to a per-call nonce, not a global opt-out.
  const styleSrc = `'self' 'nonce-${nonce}' https://fonts.googleapis.com`;

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    // Image sources — broad allowlist for marketplace product photos plus
    // data: URLs for SVG placeholders / base64 thumbs. blob: needed for
    // Next/Image placeholder generation.
    "img-src 'self' https://placehold.co https://images.unsplash.com https://picsum.photos https://fastly.picsum.photos https://images.tokopedia.net https://p16-images-sign-sg.tokopedia-static.net https://p19-images-sign-sg.tokopedia-static.net https://cf.shopee.co.id https://s-cf-id.shopeesz.com https://s.bukalapak.com https://www.static-src.com https://img.lazcdn.com https://i5.walmartimages.com https://p16-oec-sg.tiktokcdn.com data: blob:",
    "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com",
    // connect-src covers fetch/XHR/WebSocket. Supabase REST + Realtime
    // (wss://). Vercel Analytics + Live.
    "connect-src 'self' https://*.supabase.co https://vitals.vercel-insights.com wss://*.supabase.co https://vercel.live",
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    // Only meaningful over HTTPS — local dev is HTTP.
    ...(isProduction ? ["upgrade-insecure-requests"] : []),
  ];
  return directives.join("; ");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");
  const method = request.method;
  const isProduction = process.env.NODE_ENV === "production";

  // Per-request nonce — applied to ALL responses (pages + API) so inline
  // scripts/styles work consistently. The nonce also leaks through the
  // `x-nonce` request header so server components can attach it to any
  // custom inline `<script nonce={...}>` they emit (e.g. JSON-LD in
  // src/lib/seo.tsx).
  const nonce = generateNonce();
  const csp = buildCsp(nonce, isProduction);

  // Forward the nonce on the *request* so server components can read it
  // via `headers()` from `next/headers`. The `response.headers` below
  // sets the CSP for the browser.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  // CORS preflight: respond immediately. CSP still set so OPTIONS
  // responses carry the header too.
  if (method === "OPTIONS") {
    const preflight = new NextResponse(null, { status: 204 });
    preflight.headers.set("Content-Security-Policy", csp);
    return addCorsHeaders(preflight, origin);
  }

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);

  // API-specific logic: CORS, CSRF, API security headers.
  if (pathname.startsWith("/api/")) {
    response = addCorsHeaders(response, origin);

    if (!SAFE_METHODS.has(method)) {
      const requiresCSRF = CSRF_PROTECTED_PATHS.some((path) =>
        pathname.startsWith(path),
      );
      if (requiresCSRF) {
        const denied = checkCsrf(request, pathname);
        if (denied) return denied;
      }
    }

    // API-side hardening headers. The page-side equivalents live in
    // next.config.ts (HSTS, COOP/COEP/CORP, Permissions-Policy, etc.).
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  }

  // Request ID for distributed tracing — applied to every response so
  // Vercel logs / Sentry can correlate page + API requests in one trace.
  const requestId = crypto.randomUUID();
  response.headers.set("X-Request-ID", requestId);

  return response;
}

export const config = {
  // Run proxy on all routes except static assets that don't need CSP /
  // request ID / nonce. The function itself branches on path to decide
  // whether to apply API-specific (CORS/CSRF) logic.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};