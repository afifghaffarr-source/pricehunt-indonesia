/**
 * offer-product-link.ts
 *
 * Best-effort auto-link between orphan offers (product_id IS NULL) and
 * existing catalog products, by extracting identifying tokens from the
 * offer title and matching them against `products.name`.
 *
 * Used by the admin "approve offer" workflow so that an approved offer
 * with no explicit `product_id` ends up visible in public /search pages.
 *
 * Conservative heuristics: the link is only set if the match is clearly
 * stronger than the runner-up. Ambiguous matches are left as orphans
 * (logged + surfaced to the audit metadata) so a human can pick later.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

const STOPWORDS = new Set([
  // Marketing / claim words
  "resmi",
  "official",
  "store",
  "toko",
  "premium",
  "new",
  "baru",
  "original",
  "promo",
  "garansi",
  "second",
  "like",
  "sale",
  "hot",
  "best",
  "limited",
  "edition",
  "free",
  "ongkir",
  "kirim",
  "cod",
  "fast",
  "express",
  "pcs",
  "keping",
  "from",
  // Connectivity / variants that clash across product families
  "5g",
  "4g",
  "wifi",
  "lte",
  "bluetooth",
  // Storage sizes (very noisy — match too readily across products)
  "8gb", "16gb", "32gb", "64gb", "128gb", "256gb", "512gb", "1tb",
  "2tb", "8gb1tb", "16gb1tb", "256gb1tb", "512gb1tb", "1tb2tb",
  "gb", "tb",
  "ramp",
  "ssd",
  "hdd",
  // Generic "product from shopee/tokopedia" titles (would match anything)
  "product",
  "send",
]);

/** Extract alphanumeric tokens of length >= 2 (lowercased). */
function tokenize(text: string): string[] {
  return (text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

/** Deduplicate + remove stopwords. Keeps alphanumeric ordering. */
function identifyingTokens(
  tokens: string[],
  options: { maxTokens: number } = { maxTokens: 6 },
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokens) {
    if (STOPWORDS.has(t)) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= options.maxTokens) break;
  }
  return out;
}

export type AutoLinkMatch = {
  product_id: string;
  product_slug: string;
  product_name: string;
  matched_tokens: string[];
  score: number;
  runner_up?: { product_name: string; score: number };
};

/**
 * Try to find the most likely catalog product for an orphan offer title.
 * Returns null when no candidate is obviously best. Always runs cheap
 * PostgREST queries — no client-side scoring of all 59 products in JS.
 */
export async function findBestMatchingProduct(
  supabase: SupabaseClient<any>,
  offerTitle: string,
): Promise<AutoLinkMatch | null> {
  const tokens = identifyingTokens(tokenize(offerTitle ?? ""));
  if (tokens.length < 2) {
    return null; // not enough info to match anything with confidence
  }

  // PostgREST OR over ilike for each token. Each candidate row must contain
  // at least one of our tokens to be returned. Scoring happens in JS below.
  // Using AND'd groups (intersect) would be more precise but is harder to
  // express in PostgREST without complex CTE; OR is good enough at 59 rows.
  const orFilters = tokens.map((t) => `name.ilike.*${t}*`).join(",");
  const { data: candidates, error } = await supabase
    .from("products")
    .select("id, name, slug")
    .or(orFilters)
    .limit(20);

  if (error || !candidates || candidates.length === 0) return null;

  const scored = candidates
    .map((c) => {
      const cTokens = tokenize(c.name ?? "");
      // Exact match only — substring matching created false positives
      // (e.g. Dell XPS matched iPhone 16 because both names contain "16"
      // / "256" substrings).
      const matched = cTokens.filter((ct) => tokens.includes(ct));
      return {
        row: c,
        score: matched.length,
        matchedTokens: matched,
      };
    })
    .filter((s) => s.score >= 3)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;

  const best = scored[0];
  const second = scored[1];

  // Require >=3 token matches AND clear margin over runner-up (the
  // semantics threshold reduces false positives when product names share
  // generic tokens like "iphone"/"16"/digit-strings across catalogs).
  const isClearlyBest =
    best.score >= 3 && best.score - (second?.score ?? 0) >= 1;

  if (!isClearlyBest) return null;

  return {
    product_id: best.row.id,
    product_slug: best.row.slug,
    product_name: best.row.name,
    matched_tokens: best.matchedTokens,
    score: best.score,
    runner_up: second
      ? { product_name: second.row.name, score: second.score }
      : undefined,
  };
}
