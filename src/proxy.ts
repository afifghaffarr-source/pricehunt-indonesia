import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { getAppUrl } from "@/lib/app-url";
import { getCronSecret, getIngestionSecret } from "@/lib/env";

// Proxy always runs on Node.js runtime in Next.js 16 (per
// https://nextjs.org/docs/messages/middleware-to-proxy). We need the Node
// runtime so `fs.readFileSync` is available at module load to read the
// build-time CSP hash manifest. No `export const runtime` needed.

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
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

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

  if (pathname.startsWith("/api/admin")) {
    return NextResponse.json(
      { error: "Untrusted origin for admin endpoint" },
      { status: 403 },
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// CSP hash manifest — loaded once at module init from the build artifact
// produced by scripts/extract-csp-hashes.mjs (postbuild npm hook).
// ---------------------------------------------------------------------------

interface CspStaticHashesManifest {
  staticRoutes: Record<string, string[]>;
  generatedAt: string;
  totalStaticRoutes: number;
  totalInlineScripts: number;
}

let STATIC_ROUTE_HASHES: Record<string, string[]> = {};
let HASHES_LOADED = false;

function loadStaticRouteHashes(): Record<string, string[]> {
  if (HASHES_LOADED) return STATIC_ROUTE_HASHES;
  HASHES_LOADED = true;
  const path = join(process.cwd(), ".next", "csp-static-hashes.json");
  if (!existsSync(path)) {
    console.warn(
      "[proxy/csp] .next/csp-static-hashes.json missing — static pages will " +
        "use the nonce CSP fallback (which fails for prerendered routes). " +
        "Re-run `npm run build` so the postbuild hook regenerates the manifest.",
    );
    return STATIC_ROUTE_HASHES;
  }
  try {
    const manifest = JSON.parse(readFileSync(path, "utf-8")) as CspStaticHashesManifest;
    STATIC_ROUTE_HASHES = manifest.staticRoutes ?? {};
    console.log(
      `[proxy/csp] Loaded ${Object.keys(STATIC_ROUTE_HASHES).length} static-route ` +
        `hash sets (generated ${manifest.generatedAt})`,
    );
  } catch (err) {
    console.error(`[proxy/csp] Failed to parse hash manifest: ${err}`);
  }
  return STATIC_ROUTE_HASHES;
}

/**
 * Build a hash-based CSP for a static (prerendered) route.
 *
 * `script-src` includes every SHA-256 of every inline `<script>` block
 * emitted by Next.js at build time for this route. External chunks
 * (`<script src="/_next/static/chunks/...">`) are covered by `'self'`.
 *
 * `'strict-dynamic'` is intentionally NOT used here: it only matters for
 * scripts that load further scripts (e.g. via `document.createElement`).
 * Next.js framework scripts load their dependencies as regular external
 * `<script src>` tags in the HTML, so `'self'` covers them.
 */
function buildStaticCsp(hashes: string[], isProduction: boolean): string {
  const scriptSrc = [
    "'self'",
    ...hashes,
    "https://va.vercel-scripts.com",
    "https://vercel.live",
  ].join(" ");

  const styleSrc = "'self' 'unsafe-inline' https://fonts.googleapis.com";

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    "img-src 'self' https://placehold.co https://images.unsplash.com https://picsum.photos https://fastly.picsum.photos https://images.tokopedia.net https://p16-images-sign-sg.tokopedia-static.net https://p19-images-sign-sg.tokopedia-static.net https://cf.shopee.co.id https://s-cf-id.shopeesz.com https://s.bukalapak.com https://www.static-src.com https://img.lazcdn.com https://i5.walmartimages.com https://p16-oec-sg.tiktokcdn.com data: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co https://vitals.vercel-insights.com wss://*.supabase.co https://vercel.live",
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(isProduction ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

/**
 * Build a nonce-based CSP for dynamic (server-rendered) routes.
 *
 * The nonce is also passed via the `x-nonce` request header so server
 * components (e.g. `src/lib/seo.tsx` for JSON-LD) can attach it to their
 * custom inline `<script>` tags.
 */
function buildDynamicCsp(nonce: string, isProduction: boolean): string {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    "https://va.vercel-scripts.com",
    "https://vercel.live",
    ...(isProduction ? [] : ["'unsafe-eval'"]), // dev HMR only
  ].join(" ");

  const styleSrc = `'self' 'nonce-${nonce}' https://fonts.googleapis.com`;

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    "img-src 'self' https://placehold.co https://images.unsplash.com https://picsum.photos https://fastly.picsum.photos https://images.tokopedia.net https://p16-images-sign-sg.tokopedia-static.net https://p19-images-sign-sg.tokopedia-static.net https://cf.shopee.co.id https://s-cf-id.shopeesz.com https://s.bukalapak.com https://www.static-src.com https://img.lazcdn.com https://i5.walmartimages.com https://p16-oec-sg.tiktokcdn.com data: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co https://vitals.vercel-insights.com wss://*.supabase.co https://vercel.live",
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(isProduction ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

/**
 * Normalise a request pathname to the form used in the static-route hash
 * manifest. Handles trailing slash, query string, and strip.
 */
function normalisePath(pathname: string): string {
  // Strip query string (NextRequest.nextUrl.pathname already excludes it)
  // Normalise trailing slash: "/auth/login/" → "/auth/login"
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

/**
 * Decide whether a request path should get the hash-based CSP (static /
 * prerendered) or the nonce-based CSP (dynamic / server-rendered).
 *
 * Static routes are determined by membership in the hash manifest.
 * Everything else (dynamic pages, API routes, 404s) gets nonce.
 */
function isStaticRoute(pathname: string): boolean {
  const route = normalisePath(pathname);
  return STATIC_ROUTE_HASHES[route] !== undefined;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");
  const method = request.method;
  const isProduction = process.env.NODE_ENV === "production";

  // Handle CORS preflight requests
  if (method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    return addCorsHeaders(response, origin);
  }

  // Lazy-load the static hash manifest on first page request (cheaper than
  // at module init when running tests that don't touch page routes).
  const isApiRoute = pathname.startsWith("/api/");
  if (!isApiRoute) {
    loadStaticRouteHashes();
  }

  const requestHeaders = new Headers(request.headers);
  let csp: string;
  let nonceForThisRequest: string | null = null;

  if (isStaticRoute(pathname)) {
    // Static (prerendered) route: hash-based CSP, no nonce.
    const hashes = STATIC_ROUTE_HASHES[normalisePath(pathname)] ?? [];
    csp = buildStaticCsp(hashes, isProduction);
  } else {
    // Dynamic route (or anything not in the static manifest, including 404):
    // per-request nonce + strict-dynamic.
    nonceForThisRequest = randomUUID().replace(/-/g, "");
    csp = buildDynamicCsp(nonceForThisRequest, isProduction);
    // Forward the nonce on the request so server components can read it
    // via `headers().get("x-nonce")` and attach it to custom inline
    // <script> tags (e.g. JSON-LD in src/lib/seo.tsx).
    requestHeaders.set("x-nonce", nonceForThisRequest);
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Set CSP on every response (pages + API + static assets we matched).
  response.headers.set("Content-Security-Policy", csp);

  // API route logic: CORS + CSRF + security headers
  if (isApiRoute) {
    addCorsHeaders(response, origin);

    if (!SAFE_METHODS.has(method)) {
      const requiresCSRF = CSRF_PROTECTED_PATHS.some((path) =>
        pathname.startsWith(path),
      );
      if (requiresCSRF) {
        const denied = checkCsrf(request, pathname);
        if (denied) return denied;
      }
    }

    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  }

  // Request ID for tracing (useful for log correlation)
  response.headers.set("X-Request-ID", randomUUID());

  return response;
}

export const config = {
  // Run on every route except Next.js internals and common static files.
  // The `_next/static` exclusion keeps middleware out of the chunk-serving
  // hot path; those responses never include inline scripts so they don't
  // need a CSP.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};