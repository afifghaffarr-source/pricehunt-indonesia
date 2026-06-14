import { getAppUrl } from './app-url';

/**
 * CSRF Protection Utilities
 */

import { cookies } from 'next/headers';

const CSRF_TOKEN_LENGTH = 32  // 32 bytes
const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

export function generateCSRFToken(): string {
  const array = new Uint8Array(CSRF_TOKEN_LENGTH);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function getCSRFToken(): Promise<string> {
  const cookieStore = await cookies();
  let token = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  
  if (!token) {
    token = generateCSRFToken();
    cookieStore.set(CSRF_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    });
  }
  
  return token;
}

export async function validateCSRF(request: Request): Promise<boolean> {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return true;
  }
  
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  
  if (!headerToken) {
    const referer = request.headers.get('referer');
    const origin = request.headers.get('origin');
    const appUrl = getAppUrl();
    
    if (referer && new URL(referer).origin === appUrl) return true;
    if (origin === appUrl) return true;
    return false;
  }
  
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  
  if (!sessionToken) return false;
  return timingSafeEqual(headerToken, sessionToken);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

