/**
 * Shared font loader for OG image routes.
 *
 * Fetches Inter (latin, 400 + 700 + 800) from the jsDelivr CDN once per
 * serverless cold start, then caches via Next's fetch cache. Satori (the
 * renderer behind `next/og` ImageResponse) requires real font binaries
 * passed in as ArrayBuffers — Tailwind / system fonts are not supported.
 *
 * 500KB bundle size cap on OG routes per Next.js docs, so we ship only
 * the 3 weights we actually use.
 */

const FONT_CDN =
  "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files";

const FONT_URLS = {
  400: `${FONT_CDN}/inter-latin-400-normal.woff`,
  700: `${FONT_CDN}/inter-latin-700-normal.woff`,
  800: `${FONT_CDN}/inter-latin-800-normal.woff`,
} as const;

type FontWeight = keyof typeof FONT_URLS;

const cache = new Map<FontWeight, ArrayBuffer>();

async function loadFont(weight: FontWeight): Promise<ArrayBuffer> {
  if (cache.has(weight)) return cache.get(weight)!;
  // CDN URLs are versioned + content-addressed — safe to cache aggressively.
  // We cache in module scope (per serverless instance) AND let the HTTP
  // layer cache with `Cache-Control: public, immutable` from jsDelivr.
  const res = await fetch(FONT_URLS[weight]);
  if (!res.ok) {
    throw new Error(
      `Failed to load Inter ${weight} from CDN: ${res.status} ${res.statusText}`
    );
  }
  const buf = await res.arrayBuffer();
  cache.set(weight, buf);
  return buf;
}

/** Returns an array of font descriptors for `ImageResponse({ fonts: ... })`. */
export async function loadOgFonts(): Promise<
  { name: string; data: ArrayBuffer; weight: 400 | 700 | 800; style: "normal" }[]
> {
  const [w400, w700, w800] = await Promise.all([
    loadFont(400),
    loadFont(700),
    loadFont(800),
  ]);
  return [
    { name: "Inter", data: w400, weight: 400, style: "normal" },
    { name: "Inter", data: w700, weight: 700, style: "normal" },
    { name: "Inter", data: w800, weight: 800, style: "normal" },
  ];
}
