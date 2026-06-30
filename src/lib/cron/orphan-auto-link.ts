import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { findBestProductMatch } from "@/lib/ingestion/matcher";
import { logAdminAction } from "@/lib/admin-audit";
import { sendTelegramMessageFromEnv } from "@/lib/telegram/send-message";

export type OrphanAutoLinkResult = {
  processed:    number;
  linked:       number;
  still_orphan: number;
  errors:       number;
  duration_ms:  number;
  top_links:    Array<{ offer_id: string; product_id: string; score: number }>;
  /**
   * Count of *candidates* (not just linked ones) per marketplace id,
   * grouped from `offers.marketplace_id`. Nulls are bucketed as
   * `"unknown"`. Used by the Telegram summary so operators can see
   * which marketplace dominates the orphan pool on a given run.
   */
  per_marketplace: Record<string, number>;
};

const AUTO_LINK_MIN_CONFIDENCE = new Set(["high", "medium"] as const);
const DEFAULT_CAP = 500;
const DEFAULT_MAX_AGE_DAYS = 90;
const UNKNOWN_MARKETPLACE = "unknown";

function extractCondition(title: string): "new" | "used" | "refurbished" {
  const lower = title.toLowerCase();
  if (/(bekas|second|seken|used|preloved|refurb)/.test(lower)) return "used";
  if (/(replika|replica|kw1|kw2|fake|palsu|tiruan)/.test(lower)) return "used";
  return "new";
}

/**
 * Format the start-of-run timestamp as `YYYY-MM-DD HH:mm WIB` for the
 * Telegram message header. We pin to `Asia/Jakarta` because the cron
 * schedule is 02:00 WIB daily — operators read the message at the same
 * timezone they expect the job to run in. `Intl.DateTimeFormat` is
 * available in Node 20+ and Vercel's edge runtime.
 */
function formatWIBTimestamp(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")} WIB`;
}

/**
 * Build the Indonesian-language summary text that gets sent to Telegram.
 * Pure function — kept here (not in the telegram module) because the
 * shape is specific to the orphan-auto-link result.
 *
 * Label choices follow the brief's preference for plain-text Indonesian
 * labels (Diproses / Berhasil / Dilewati / Gagal / Durasi) and the
 * canonical marketplace category header. The "X offers" suffix is
 * Indonesian-English; the spec example used it verbatim and it reads
 * naturally for the target audience.
 */
export function formatOrphanSummary(
  result: OrphanAutoLinkResult,
  startedAt: Date,
): string {
  const stamp = formatWIBTimestamp(startedAt);
  const durationS = (result.duration_ms / 1000).toFixed(1);

  const lines: string[] = [
    `BijakBeli Orphan Auto-Link — ${stamp}`,
    `Diproses: ${result.processed}`,
    `Berhasil: ${result.linked}`,
    `Dilewati: ${result.still_orphan}`,
    `Gagal: ${result.errors}`,
    `Durasi: ${durationS}s`,
  ];

  const marketEntries = Object.entries(result.per_marketplace ?? {})
    .sort((a, b) => b[1] - a[1]);
  if (marketEntries.length > 0) {
    lines.push("", "Per marketplace:");
    for (const [name, count] of marketEntries) {
      lines.push(`  ${name}: ${count} offers`);
    }
  }

  return lines.join("\n");
}

export async function runOrphanAutoLink(
  opts: { cap?: number; maxAgeDays?: number } = {},
  supabase: SupabaseClient = createAdminClient(),
): Promise<OrphanAutoLinkResult> {
  const start = Date.now();
  const startedAt = new Date(start);
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

  // Tally candidates per marketplace for the Telegram summary. We track
  // ALL candidates (not just linked) so the breakdown matches the
  // "Diproses" total — same shape as the Phase 2 spec example.
  const perMarketplace: Record<string, number> = {};
  for (const offer of candidates ?? []) {
    const key = offer.marketplace_id ?? UNKNOWN_MARKETPLACE;
    perMarketplace[key] = (perMarketplace[key] ?? 0) + 1;
  }

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
    per_marketplace: perMarketplace,
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

  // 5. Telegram summary (best-effort). `sendTelegramMessageFromEnv`
  // swallows both transport errors and missing env; calling it here
  // means a Telegram outage NEVER breaks the cron. The `await` keeps
  // the Vercel function alive long enough to deliver the message
  // before responding (we have 10s on Hobby plan, and the body of
  // this function typically takes <2s on a normal run).
  try {
    const summary = formatOrphanSummary(result, startedAt);
    await sendTelegramMessageFromEnv(summary);
  } catch (e) {
    // Defensive: sendTelegramMessageFromEnv is documented to never
    // throw, but a future regression must not break the cron. Log and
    // continue.
    console.error("[orphan-auto-link] telegram summary threw unexpectedly:", e);
  }

  return result;
}
