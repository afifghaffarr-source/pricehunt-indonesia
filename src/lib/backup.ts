import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

/**
 * Database backup utilities.
 *
 * Backs up the canonical schema (post-A-002 prices→offers migration):
 * - products
 * - marketplaces
 * - offers (replaces legacy `prices` table)
 * - price_snapshots (replaces legacy `price_history` table)
 *
 * Explicitly NOT backed up:
 * - ingestion_logs (operational, not config; re-creatable from job runs)
 * - crawl_targets (operational state; re-creatable by cron)
 * - user_profiles, price_alerts, price_conflicts, price_reports (PII, requires
 *   separate secure export flow)
 *
 * Callers:
 * - /api/backup (admin-only, downloads .sql)
 */

/**
 * Safely escape values for PostgreSQL SQL strings
 * Handles single quotes, backslashes, null bytes, and other special characters
 */
function escapeSQLString(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";

  let str = String(value);
  str = str.replace(/'/g, "''");      // single quotes
  str = str.replace(/\\/g, "\\\\");   // backslashes
  str = str.replace(/\0/g, "");        // null bytes
  return `'${str}'`;
}

function escapeJsonb(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "string") return escapeSQLString(value);
  return escapeSQLString(JSON.stringify(value));
}

function escapeArray(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (!Array.isArray(value)) return escapeSQLString(value);
  const escaped = value.map(v => escapeSQLString(v)).join(",");
  return `ARRAY[${escaped}]`;
}

// ============================================================================
// Types
// ============================================================================

export type BackupData = {
  timestamp: string;
  data: {
    products: Database["public"]["Tables"]["products"]["Row"][];
    marketplaces: Database["public"]["Tables"]["marketplaces"]["Row"][];
    offers: Database["public"]["Tables"]["offers"]["Row"][];
    price_snapshots: Database["public"]["Tables"]["price_snapshots"]["Row"][];
  };
  stats: {
    products: number;
    marketplaces: number;
    offers: number;
    price_snapshots: number;
  };
};

// ============================================================================
// Backup export
// ============================================================================

const TABLES_TO_BACKUP = [
  "products",
  "marketplaces",
  "offers",
  "price_snapshots",
] as const;

export async function exportBackup(): Promise<BackupData> {
  const supabase = await createClient();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  // Initialize with empty arrays using the correct type for each table
  const data: {
    products: Database["public"]["Tables"]["products"]["Row"][];
    marketplaces: Database["public"]["Tables"]["marketplaces"]["Row"][];
    offers: Database["public"]["Tables"]["offers"]["Row"][];
    price_snapshots: Database["public"]["Tables"]["price_snapshots"]["Row"][];
  } = {
    products: [],
    marketplaces: [],
    offers: [],
    price_snapshots: [],
  };

  for (const table of TABLES_TO_BACKUP) {
    const { data: rows, error } = await supabase
      .from(table)
      .select("*");
    if (error) {
      console.error(`[backup] failed to fetch ${table}:`, error.message);
      // Continue with empty array — partial backup is better than no backup
      data[table] = [];
    } else {
      data[table] = (rows ?? []) as never;
    }
  }

  return {
    timestamp,
    data,
    stats: {
      products: data.products.length,
      marketplaces: data.marketplaces.length,
      offers: data.offers.length,
      price_snapshots: data.price_snapshots.length,
    },
  };
}

// ============================================================================
// Seed SQL generation
// ============================================================================

/**
 * Generate a self-contained PostgreSQL seed file.
 *
 * Order matters for foreign keys:
 *   1. marketplaces (no FK)
 *   2. products (no FK among the backed-up tables)
 *   3. offers (FK → products, marketplaces)
 *   4. price_snapshots (FK → offers)
 *
 * Each block uses ON CONFLICT DO NOTHING so the file is idempotent
 * (re-running on top of existing data won't error out).
 */
export function generateSeedSQL(backup: BackupData): string {
  const now = new Date().toISOString();
  let sql = `-- BijakBeli Auto-Generated Seed\n`;
  sql += `-- Generated: ${now}\n`;
  sql += `-- Source timestamp: ${backup.timestamp}\n`;
  sql += `-- Stats: ${backup.stats.products} products, ${backup.stats.marketplaces} marketplaces, ${backup.stats.offers} offers, ${backup.stats.price_snapshots} price_snapshots\n\n`;
  sql += `BEGIN;\n\n`;

  // 1. Marketplaces
  sql += `-- Marketplaces (${backup.stats.marketplaces})\n`;
  for (const mp of backup.data.marketplaces) {
    sql += `INSERT INTO marketplaces (id, name, display_name, base_url, color, is_active) VALUES (${escapeSQLString(mp.id)}, ${escapeSQLString(mp.name)}, ${escapeSQLString(mp.display_name)}, ${escapeSQLString(mp.base_url)}, ${escapeSQLString(mp.color)}, ${mp.is_active === null ? "TRUE" : mp.is_active}) ON CONFLICT (id) DO NOTHING;\n`;
  }
  sql += "\n";

  // 2. Products
  sql += `-- Products (${backup.stats.products})\n`;
  for (const p of backup.data.products) {
    sql += `INSERT INTO products (id, slug, name, category, description, image_url, specs, ai_verdict, lowest_price, highest_price, average_price, deal_score) VALUES (${escapeSQLString(p.id)}, ${escapeSQLString(p.slug)}, ${escapeSQLString(p.name)}, ${escapeSQLString(p.category)}, ${escapeSQLString(p.description)}, ${escapeSQLString(p.image_url)}, ${escapeJsonb(p.specs)}, ${escapeSQLString(p.ai_verdict)}, ${p.lowest_price ?? 0}, ${p.highest_price ?? 0}, ${p.average_price ?? 0}, ${p.deal_score ?? 0}) ON CONFLICT (id) DO NOTHING;\n`;
  }
  sql += "\n";

  // 3. Offers
  sql += `-- Offers (${backup.stats.offers})\n`;
  for (const o of backup.data.offers) {
    sql += `INSERT INTO offers (id, product_id, marketplace_id, marketplace_product_id, title, url, image_url, current_price, original_price, discount_percentage, stock_status, is_active, seller_name, seller_id, seller_rating, seller_review_count, seller_location, is_official_store, condition, variant, shipping_estimate, shipping_info, has_free_shipping, has_voucher, voucher_text, sold_count, source, confidence_score, confidence_label, validation_status, last_checked_at, category_hint, rating, review_count, currency) VALUES (${escapeSQLString(o.id)}, ${escapeSQLString(o.product_id)}, ${escapeSQLString(o.marketplace_id)}, ${escapeSQLString(o.marketplace_product_id)}, ${escapeSQLString(o.title)}, ${escapeSQLString(o.url)}, ${escapeSQLString(o.image_url)}, ${o.current_price}, ${escapeSQLString(o.original_price)}, ${escapeSQLString(o.discount_percentage)}, ${escapeSQLString(o.stock_status)}, ${o.is_active}, ${escapeSQLString(o.seller_name)}, ${escapeSQLString(o.seller_id)}, ${escapeSQLString(o.seller_rating)}, ${escapeSQLString(o.seller_review_count)}, ${escapeSQLString(o.seller_location)}, ${o.is_official_store}, ${escapeSQLString(o.condition)}, ${escapeSQLString(o.variant)}, ${escapeSQLString(o.shipping_estimate)}, ${escapeSQLString(o.shipping_info)}, ${o.has_free_shipping}, ${o.has_voucher}, ${escapeSQLString(o.voucher_text)}, ${escapeSQLString(o.sold_count)}, ${escapeSQLString(o.source)}, ${escapeSQLString(o.confidence_score)}, ${escapeSQLString(o.confidence_label)}, ${escapeSQLString(o.validation_status)}, ${escapeSQLString(o.last_checked_at)}, ${escapeSQLString(o.category_hint)}, ${escapeSQLString(o.rating)}, ${escapeSQLString(o.review_count)}, ${escapeSQLString(o.currency)}) ON CONFLICT (id) DO NOTHING;\n`;
  }
  sql += "\n";

  // 4. Price snapshots
  sql += `-- Price snapshots (${backup.stats.price_snapshots})\n`;
  for (const s of backup.data.price_snapshots) {
    sql += `INSERT INTO price_snapshots (id, offer_id, current_price, original_price, discount_percent, stock_status, voucher_text, shipping_estimate, source, confidence_score, captured_at) VALUES (${escapeSQLString(s.id)}, ${escapeSQLString(s.offer_id)}, ${s.current_price}, ${escapeSQLString(s.original_price)}, ${escapeSQLString(s.discount_percent)}, ${escapeSQLString(s.stock_status)}, ${escapeSQLString(s.voucher_text)}, ${escapeSQLString(s.shipping_estimate)}, ${escapeSQLString(s.source)}, ${escapeSQLString(s.confidence_score)}, ${escapeSQLString(s.captured_at)}) ON CONFLICT (id) DO NOTHING;\n`;
  }
  sql += "\n";

  sql += `COMMIT;\n`;
  return sql;
}
