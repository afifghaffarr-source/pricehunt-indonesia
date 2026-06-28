/**
 * Shared design tokens for OG image routes.
 *
 * Keep all visual constants here so the homepage / product / search / deals
 * images stay visually consistent. Satori only understands inline styles
 * and flexbox — there is no Tailwind and no CSS variables.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;

export const colors = {
  // Brand: deep emerald + indigo — used in gradients, no longer pure #2563eb
  // to differentiate the OG surface from generic Next.js blue.
  brandA: "#0f766e", // teal-700
  brandB: "#1d4ed8", // blue-700
  brandC: "#0b1320", // near-black

  // Surfaces
  bg: "#ffffff",
  bgMuted: "#f8fafc", // slate-50
  border: "#e2e8f0", // slate-200

  // Text on light surfaces
  textPrimary: "#0f172a", // slate-900
  textSecondary: "#475569", // slate-600
  textMuted: "#94a3b8", // slate-400

  // Text on dark surfaces
  textOnDark: "#ffffff",
  textOnDarkMuted: "rgba(255,255,255,0.78)",

  // Deal indicators
  deal: "#059669", // emerald-600
  dealBg: "#d1fae5", // emerald-100
  warn: "#d97706", // amber-600
} as const;

export const radii = {
  sm: 8,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

/** Format an IDR price with dot as thousands separator (Indonesian convention). */
export function formatIdr(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  // Round to nearest integer first, then split into thousands.
  const n = Math.round(value);
  return "Rp " + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
