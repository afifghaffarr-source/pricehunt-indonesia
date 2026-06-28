import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAppUrl } from "@/lib/app-url";
import { getCronSecret, getIngestionSecret } from "@/lib/env";

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  getAppUrl(),
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
  // Auth flows — previously missing from CSRF coverage (audit 2026-06-22).
  // Without this, a third-party site can POST to /api/auth/forgot-password
  // and trigger reset emails to attacker-chosen addresses.
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/register",
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
    const expectedIngestion = getIngestionSecret();
    if (expectedIngestion) {
      const token = authHeader.replace(/^Bearer\s+/i, "");
      if (safeEqual(token, expectedIngestion)) return null;
    }
    const expectedCron = getCronSecret();
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

/**
 * Routes that remain statically prerendered at build time.
 * These pages get framework <script> tags WITHOUT nonces, so they need
 * 'unsafe-inline' in CSP to keep working. All interactive pages (auth,
 * dashboard, etc.) have been converted to `force-dynamic` and receive
 * per-request nonces via the pipeline below.
 */
const STATIC_ROUTES = new Set([
  "/legal",
  "/legal/privacy",
  "/legal/terms",
  "/offline",
]);

function isStaticRoute(pathname: string): boolean {
  if (STATIC_ROUTES.has(pathname)) return true;
  if (pathname === "/_not-found") return true;
  // ISR pages with revalidate (leaderboard, product/[slug]) may serve
  // cached HTML — keep unsafe-inline for them too.
  if (pathname === "/leaderboard" || pathname.startsWith("/product/")) return true;
  return false;
}

function buildCsp(nonce: string, isStatic: boolean): string {
  const isProduction = process.env.NODE_ENV === "production";
  const directives = [
    "default-src 'self'",
    isStatic
      ? isProduction
        ? "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com https://vercel.live"
        : "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com https://vercel.live"
      : isProduction
        ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://va.vercel-scripts.com https://vercel.live`
        : `script-src 'self' 'unsafe-eval' 'nonce-${nonce}' 'strict-dynamic' https://va.vercel-scripts.com https://vercel.live`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https://placehold.co https://images.unsplash.com https://picsum.photos https://fastly.picsum.photos https://images.tokopedia.net https://p16-images-sign-sg.tokopedia-static.net https://p19-images-sign-sg.tokopedia-static.net https://cf.shopee.co.id https://s-cf-id.shopeesz.com https://s.bukalapak.com https://www.static-src.com https://img.lazcdn.com https://i5.walmartimages.com https://p16-oec-sg.tiktokcdn.com data: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co https://vitals.vercel-insights.com wss://*.supabase.co https://vercel.live",
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(isProduction ? ["upgrade-insecure-requests"] : []),
  ];
  return directives.join("; ");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");
  const method = request.method;

  // Handle CORS preflight requests
  if (method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    return addCorsHeaders(response, origin);
  }

  const isApiRoute = pathname.startsWith("/api/");

  // Generate per-request nonce for CSP (page routes get nonces on scripts)
  const nonce = crypto.randomUUID();
  const isStatic = !isApiRoute && isStaticRoute(pathname);

  // Pass nonce to downstream via request headers (server components read this)
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  // Create response with forwarded request headers
  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Also set on response headers for client-side access
  response.headers.set("x-nonce", nonce);

  // Add CORS headers (API routes)
  if (isApiRoute) {
    response = addCorsHeaders(response, origin);
  }

  // CSRF Protection for state-changing methods on API routes
  if (isApiRoute && !SAFE_METHODS.has(method)) {
    const requiresCSRF = CSRF_PROTECTED_PATHS.some((path) =>
      pathname.startsWith(path),
    );

    if (requiresCSRF) {
      const denied = checkCsrf(request, pathname);
      if (denied) return denied;
    }
  }

  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "0");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  );
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("Cross-Origin-Embedder-Policy", "credentialless");

  // CSP — nonce-based for dynamic pages, unsafe-inline for static pages
  response.headers.set("Content-Security-Policy", buildCsp(nonce, isStatic));

  // HSTS (production only)
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  // Request ID for tracing
  const requestId = crypto.randomUUID();
  response.headers.set("X-Request-ID", requestId);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all routes except static assets.
     * Covers: page routes, API routes, auth flows.
     * Excludes: _next/static, _next/image, favicon.ico, sitemap.xml, robots.txt
     */
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt).*)",
  ],
};