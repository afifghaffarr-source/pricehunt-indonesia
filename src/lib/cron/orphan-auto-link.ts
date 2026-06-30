import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { findBestProductMatch } from "@/lib/ingestion/matcher";
import { logAdminAction } from "@/lib/admin-audit";

export type OrphanAutoLinkResult = {
  processed:    number;
  linked:       number;
  still_orphan: number;
  errors:       number;
  duration_ms:  number;
  top_links:    Array<{ offer_id: string; product_id: string; score: number }>;
};

const AUTO_LINK_MIN_CONFIDENCE = new Set(["high", "medium"] as const);
const DEFAULT_CAP = 500;
const DEFAULT_MAX_AGE_DAYS = 90;

function extractCondition(title: string): "new" | "used" | "refurbished" {
  const lower = title.toLowerCase();
  if (/(bekas|second|seken|used|preloved|refurb)/.test(lower)) return "used";
  if (/(replika|replica|kw1|kw2|fake|palsu|tiruan)/.test(lower)) return "used";
  return "new";
}

export async function runOrphanAutoLink(
  opts: { cap?: number; maxAgeDays?: number } = {},
  supabase: SupabaseClient = createAdminClient(),
): Promise<OrphanAutoLinkResult> {
  const start = Date.now();
  const cap = opts.cap ?? DEFAULT_CAP;
  const maxAgeDays = opts.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS;

  // 1. Fetch candidates (offers with no product_id, within window)
  // NOTE: schema column names are `current_price` and `marketplace_id`
  // (not `price` / `marketplace` as in the brief pseudo-code).
  const cutoff = new Date(Date.now() - maxAgeDays * 86_400_000).toISOString();
  const { data: candidates, error } = await supabase
    .from("offers")
    .select("id, title, current_price, marketplace_id, variant, created_at")
    .is("product_id", null)
    .gt("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(cap);

  if (error) {
    throw new Error(`orphan-auto-link: failed to fetch candidates: ${error.message}`);
  }

  // 2. Fetch product index (bounded for perf; Vercel Hobby = 10s budget)
  // NOTE: products table has no `brand` or `is_active` columns.
  const { data: products, error: prodErr } = await supabase
    .from("products")
    .select("id, name, category")
    .limit(500);

  if (prodErr) {
    throw new Error(`orphan-auto-link: failed to fetch products: ${prodErr.message}`);
  }

  // 3. Run matcher per candidate
  const seenProductIds = new Map<string, number>();
  const scored: Array<{ offer_id: string; product_id: string; score: number }> = [];
  let linked = 0, stillOrphan = 0, errors = 0;

  for (const offer of candidates ?? []) {
    try {
      const match = findBestProductMatch(
        {
          title: offer.title ?? "",
          price: offer.current_price,
          marketplace: offer.marketplace_id,
          variant: offer.variant,
          condition: extractCondition(offer.title ?? ""),
        },
        (products ?? []).map((p) => ({
          id: p.id,
          title: p.name,
          category: p.category,
        })),
      );

      if (
        match.bestMatch &&
        AUTO_LINK_MIN_CONFIDENCE.has(match.bestMatch.result.confidence as "high" | "medium")
      ) {
        const productId = match.bestMatch.productId;
        const score = match.bestMatch.result.score;

        const { error: updateErr } = await supabase
          .from("offers")
          .update({ product_id: productId })
          .eq("id", offer.id);

        if (!updateErr) {
          linked++;
          seenProductIds.set(productId, (seenProductIds.get(productId) ?? 0) + 1);
          scored.push({ offer_id: offer.id, product_id: productId, score });
        } else {
          errors++;
          console.error(`[orphan-auto-link] update failed for offer ${offer.id}: ${updateErr.message}`);
        }
      } else {
        stillOrphan++;
      }
    } catch (e) {
      errors++;
      console.error(`[orphan-auto-link] matcher threw for offer ${offer.id}:`, e);
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 5);

  const result: OrphanAutoLinkResult = {
    processed: (candidates ?? []).length,
    linked,
    still_orphan: stillOrphan,
    errors,
    duration_ms: Date.now() - start,
    top_links: top,
  };

  // 4. Audit log (best-effort; never throws)
  // NOTE: AdminAuditInput uses `actorId` / `actorEmail` (not `actor`),
  // and `targetType` / `targetId` (snake_case key form is rejected by the
  // TS interface even though the DB column is snake_case).
  await logAdminAction({
    actorId: "cron",
    actorEmail: null,
    action: "orphan_auto_link",
    targetType: "offers_bulk",
    targetId: "batch",
    metadata: {
      ...result,
      see_product_ids: Object.fromEntries(seenProductIds),
      cap,
      max_age_days: maxAgeDays,
    },
  });

  return result;
}
