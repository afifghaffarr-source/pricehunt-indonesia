import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL || 'https://bijakbeli.app',
  'http://localhost:3000', // Development
  'http://localhost:3001', // Alternative dev port
];

// Chrome extension pattern (for BijakBeli extension)
const EXTENSION_ORIGIN_PATTERN = /^chrome-extension:\/\/[a-z]+$/;

// Paths that require CSRF protection
const CSRF_PROTECTED_PATHS = [
  '/api/ai-advisor',
  '/api/vexo/ai',
  '/api/ingestion',
  '/api/ingestion/offer-snapshot',
  '/api/recheck-request',
  '/api/price-report',
  '/api/reviews',
  '/api/push/subscribe',
];

// Paths that are public (no auth required)
const PUBLIC_PATHS = [
  '/api/health',
  '/api/health/db',
  '/api/products',
  '/api/search',
  '/api/vexo/images',
  '/api/vexo/search',
  '/api/deals',
];

// Rate limit headers to pass through
const RATE_LIMIT_HEADERS = [
  'x-ratelimit-limit',
  'x-ratelimit-remaining',
  'x-ratelimit-reset',
  'retry-after',
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  
  // Check exact matches
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  
  // Check extension pattern
  if (EXTENSION_ORIGIN_PATTERN.test(origin)) return true;
  
  // Allow Vercel preview deployments
  if (origin.endsWith('.vercel.app')) return true;
  
  return false;
}

function addCorsHeaders(response: NextResponse, origin: string | null) {
  if (origin && isAllowedOrigin(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  }
  
  return response;
}

function generateCSRFToken(): string {
  // Generate a random CSRF token
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin');
  const method = request.method;
  
  // Handle CORS preflight requests
  if (method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    return addCorsHeaders(response, origin);
  }
  
  // Only apply to API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  
  // Create response
  let response = NextResponse.next();
  
  // Add CORS headers
  response = addCorsHeaders(response, origin);
  
  // CSRF Protection for state-changing methods
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    // Check if this path requires CSRF protection
    const requiresCSRF = CSRF_PROTECTED_PATHS.some(path => pathname.startsWith(path));
    
    if (requiresCSRF) {
      const csrfToken = request.headers.get('x-csrf-token');
      const sessionToken = request.cookies.get('csrf-token')?.value;
      
      // In production, validate CSRF token matches session
      // For now, just ensure the header exists (extension sends it)
      if (!csrfToken) {
        // Allow requests from same-origin (referer check)
        const referer = request.headers.get('referer');
        const isSameOrigin = referer && new URL(referer).origin === (process.env.NEXT_PUBLIC_APP_URL || 'https://bijakbeli.app');
        
        if (!isSameOrigin) {
          return NextResponse.json(
            { error: 'CSRF token missing' },
            { status: 403 }
          );
        }
      }
    }
  }
  
  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Add request ID for tracing
  const requestId = crypto.randomUUID();
  response.headers.set('X-Request-ID', requestId);
  
  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
};
