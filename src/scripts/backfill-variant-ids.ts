/**
 * One-time backfill: re-link offers stuck on the default variant to the
 * correct product_variants row, using variant attributes extracted from
 * the offer title (storage, color, connectivity).
 *
 * Run via: npx tsx src/scripts/backfill-variant-ids.ts
 *
 * Safety:
 *   --dry-run  Print what would change, don't write.
 *   Default    Updates `offers.variant_id` for matched offers.
 *
 * Only updates offers where the extracted variant differs from the
 * current `variant_id` (i.e. offers currently on the default variant
 * but whose title contains storage/color info that maps to a non-default
 * variant). Offers with no parseable variant in the title are skipped.
 */
import { createClient } from "@supabase/supabase-js";
import { variantNormalize } from "@/lib/ingestion/variant-normalizer";
import type { ProductVariant } from "@/types/product-types";

// Inline env loading (script runs outside Next.js)
import * as fs from "fs";
import * as path from "path";

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  const content = fs.readFileSync(envPath, "utf-8");
  const env: Record<string, string> = {};
  for (const line of content.split("\n")) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const [k, ...v] = line.split("=");
    env[k.trim()] = v.join("=").trim();
  }
  return env;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const env = loadEnv();
  const url = env["NEXT_PUBLIC_SUPABASE_URL"];
  const key = env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) {
    console.error("Missing SUPABASE env vars");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // 1. Fetch all linked offers with their title + current variant_id
  const { data: offers, error } = await supabase
    .from("offers")
    .select("id, title, variant, product_id, variant_id")
    .not("product_id", "is", null)
    .limit(500);

  if (error) {
    console.error("Failed to fetch offers:", error.message);
    process.exit(1);
  }

  console.log(`Fetched ${offers.length} linked offers`);

  // Group by product_id so we can batch-fetch variants
  const byProduct = new Map<string, typeof offers>();
  for (const o of offers) {
    const arr = byProduct.get(o.product_id) ?? [];
    arr.push(o);
    byProduct.set(o.product_id, arr);
  }

  let updated = 0;
  let skipped = 0;
  let noChange = 0;

  for (const [productId, productOffers] of byProduct) {
    // Fetch variants for this product directly from Supabase (can't use
    // listVariantsForProduct outside Next.js request scope).
    const { data: variantRows } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", productId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });

    const variants = (variantRows ?? []) as ProductVariant[];
    const defaultVariant = variants.find((v) => v.is_default);
    if (!variants.length || !defaultVariant) {
      skipped += productOffers.length;
      continue;
    }

    for (const offer of productOffers) {
      // Skip offers already on a non-default variant
      if (offer.variant_id && offer.variant_id !== defaultVariant.id) {
        noChange++;
        continue;
      }

      // Extract variant from title or variant field
      const text = offer.variant || offer.title;
      if (!text) {
        noChange++;
        continue;
      }

      const n = variantNormalize(text);
      const parts = [n.storage, n.color, n.connectivity].filter(Boolean);
      if (parts.length === 0) {
        noChange++;
        continue;
      }

      // Find matching variant
      const match = variants.find(
        (v) =>
          (v.storage ?? null) === (n.storage ?? null) &&
          (v.color ?? null) === (n.color ?? null) &&
          (v.connectivity ?? null) === (n.connectivity ?? null),
      );

      if (!match) {
        skipped++;
        continue;
      }

      // Skip if already on this variant
      if (offer.variant_id === match.id) {
        noChange++;
        continue;
      }

      if (dryRun) {
        console.log(
          `[DRY] offer ${offer.id.slice(0, 8)} → variant ${match.slug} (${parts.join(" ")})`,
        );
      } else {
        const { error: updErr } = await supabase
          .from("offers")
          .update({ variant_id: match.id })
          .eq("id", offer.id);
        if (updErr) {
          console.error(`Failed to update offer ${offer.id}: ${updErr.message}`);
          skipped++;
          continue;
        }
      }
      updated++;
    }
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped, ${noChange} no change`);
  if (dryRun) console.log("(dry run — no writes)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
