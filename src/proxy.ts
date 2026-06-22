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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");
  const method = request.method;

  // Handle CORS preflight requests
  if (method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    return addCorsHeaders(response, origin);
  }

  // Only apply to API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Create response
  let response = NextResponse.next();

  // Add CORS headers
  response = addCorsHeaders(response, origin);

  // CSRF Protection for state-changing methods
  if (!SAFE_METHODS.has(method)) {
    // Check if this path requires CSRF protection
    const requiresCSRF = CSRF_PROTECTED_PATHS.some((path) =>
      pathname.startsWith(path),
    );

    if (requiresCSRF) {
      const denied = checkCsrf(request, pathname);
      if (denied) return denied;
    }
  }

  // Add security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Add request ID for tracing
  const requestId = crypto.randomUUID();
  response.headers.set("X-Request-ID", requestId);

  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
  ],
};

// ---------------------------------------------------------------------------
// CSP nonce pipeline — ARCHITECTURAL DESIGN REQUIRED BEFORE ENABLING
// ---------------------------------------------------------------------------
//
// We previously wired up per-request CSP nonces here + in next.config.ts.
// It worked end-to-end on dynamically-rendered pages (homepage `/` got
// nonces applied to every framework <script>/<style>). But the E2E suite
// failed: statically-prerendered pages (`/auth/login`, `/auth/register`,
// etc., build output `○`) get NO nonces because Next.js renders them at
// build time without a request context. Those scripts then lack the
// nonce attribute, CSP blocks them, and the page stays on its loading
// skeleton.
//
// Per the Next.js 16 CSP guide (node_modules/next/dist/docs/.../content-
// security-policy.md), nonce-based CSP requires ALL pages to be
// dynamically rendered — static optimization, ISR, and PPR are
// incompatible. The minimum-viable rollout is:
//
//   1. Audit each route segment for safe-to-dynamic conversion (pages
//      with no request-time data are safe; pages that already read
//      cookies/headers are already dynamic).
//   2. Add `export const dynamic = 'force-dynamic'` to the root layout
//      (or per page where needed).
//   3. Measure the latency / hosting cost of full dynamic rendering.
//   4. Re-enable the proxy nonce pipeline + remove the static CSP from
//      next.config.ts.
//
// Until that design work is approved, we leave CSP in next.config.ts
// (with `'unsafe-inline'`, same as before this commit) so static pages
// keep working. The infrastructure for nonces (proxy nonce header,
// JsonLd reading x-nonce) stays in place — when we flip to dynamic-only,
// those pieces just start working without further changes.
//
// See docs/PRODUCTION_CHECKLIST.md "Security hardening roadmap" for the
// follow-up plan.