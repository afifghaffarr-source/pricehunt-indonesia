/**
 * App URL helper.
 *
 * Centralises how the application base URL is resolved. We support both
 * `NEXT_PUBLIC_APP_URL` (preferred) and `NEXT_PUBLIC_SITE_URL` (legacy).
 * If neither is set, we fall back to a sensible Vercel production default.
 *
 * Use this anywhere we previously read `process.env.NEXT_PUBLIC_SITE_URL`
 * or `process.env.NEXT_PUBLIC_APP_URL` directly. This avoids mismatches
 * such as the password reset redirect producing `undefined/auth/...`.
 */
export const DEFAULT_APP_URL = "https://www.bijakbeli.web.id";

export function getAppUrl(): string {
  const fromApp = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromApp) return fromApp.replace(/\/+$/, "");
  const fromSite = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromSite) return fromSite.replace(/\/+$/, "");
  // Best-effort: derive from Vercel's auto-injected env if available.
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return DEFAULT_APP_URL;
}
