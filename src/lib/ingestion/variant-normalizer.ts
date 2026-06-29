/**
 * Phase 2: pure TypeScript port of `collectors/base_collector.py:_normalize_variant`.
 * Tokenizes a free-text variant label into structured attributes.
 */

export interface NormalizedVariant {
  storage:      string | null;
  ram:          string | null;
  color:        string | null;
  model:        string | null;
  connectivity: string | null;
}

const STORAGE_RE  = /(\d+)\s*(gb|tb|mb)/i;
const RAM_RE      = /(\d+)\s*gb\s*ram|ram\s*(\d+)\s*gb/i;
const COLOR_RE    = /\b(hitam|putih|merah|biru|hijau|ungu|emas|perak|black|white|red|blue|green|purple|pink|gold|silver|gray|grey)\b/i;
const MODEL_RE    = /\b(pro|max|plus|ultra|lite|mini)\b/i;
const CONNECT_RE  = /\b(5g|4g|wifi|nfc|esim|dual[\s-]?sim)\b/i;

const EMPTY: NormalizedVariant = {
  storage: null, ram: null, color: null, model: null, connectivity: null,
};

export function variantNormalize(text: string | null | undefined): NormalizedVariant {
  if (!text || !text.trim()) return EMPTY;

  const s = text.toLowerCase();
  const storageMatch = s.match(STORAGE_RE);
  const ramMatch     = s.match(RAM_RE);
  const colorMatch   = s.match(COLOR_RE);
  const modelMatch   = s.match(MODEL_RE);
  const connectMatch = s.match(CONNECT_RE);

  // Model: take LAST match so hierarchical tier names like
  // "iPhone 16 Pro Max" resolve to "max" (most-specific), not "pro".
  const modelMatches = s.match(/\b(pro|max|plus|ultra|lite|mini)\b/gi) ?? [];
  const lastModel = modelMatches.length > 0 ? modelMatches[modelMatches.length - 1].toLowerCase() : null;

  return {
    storage: storageMatch
      ? `${storageMatch[1]}${storageMatch[2].toUpperCase()}`
      : null,
    ram: ramMatch
      ? `${ramMatch[1] ?? ramMatch[2]}GB`
      : null,
    color:   colorMatch   ? colorMatch[0].toLowerCase()                       : null,
    model:   modelMatch   ? lastModel                                         : null,
    connectivity: connectMatch
      ? connectMatch[0].replace(/[\s-]/g, "").toLowerCase()
      : null,
  };
}
