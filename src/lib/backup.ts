import { createClient } from "@/lib/supabase/server";

/**
 * Safely escape values for PostgreSQL SQL strings
 * Handles single quotes, backslashes, null bytes, and other special characters
 */
function escapeSQLString(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  
  let str = String(value);
  // Escape single quotes by doubling them (PostgreSQL standard)
  str = str.replace(/'/g, "''");
  // Escape backslashes
  str = str.replace(/\\/g, "\\\\");
  // Remove null bytes which can cause issues
  str = str.replace(/\0/g, "");
  
  return `'${str}'`;
}

export async function exportBackup() {
  const supabase = await createClient();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  const tables = ["products", "marketplaces", "prices", "price_history"];
  const backup: Record<string, unknown[]> = {};

  for (const table of tables) {
    const { data } = await supabase.from(table).select("*");
    backup[table] = data || [];
  }

  return {
    timestamp,
    data: backup,
    stats: {
      products: backup.products.length,
      marketplaces: backup.marketplaces.length,
      prices: backup.prices.length,
      priceHistory: backup.price_history.length,
    },
  };
}

export function generateSeedSQL(backup: {
  data: Record<string, unknown[]>;
}): string {
  let sql = "-- PriceHunt Auto-Generated Seed\n";
  sql += `-- Generated: ${new Date().toISOString()}\n\n`;

  sql += "-- Marketplaces\n";
  for (const mp of (backup.data.marketplaces || []) as Record<string, unknown>[]) {
    sql += `INSERT INTO marketplaces (id, name, display_name, base_url, color) VALUES (${escapeSQLString(mp.id)}, ${escapeSQLString(mp.name)}, ${escapeSQLString(mp.display_name)}, ${escapeSQLString(mp.base_url)}, ${escapeSQLString(mp.color)}) ON CONFLICT (name) DO NOTHING;\n`;
  }

  sql += "\n-- Products\n";
  for (const p of (backup.data.products || []) as Record<string, unknown>[]) {
    const specs = typeof p.specs === "object" ? escapeSQLString(JSON.stringify(p.specs)) : escapeSQLString("{}");
    const verdict = escapeSQLString(p.ai_verdict);
    const name = escapeSQLString(p.name);
    const category = escapeSQLString(p.category);
    const description = escapeSQLString(p.description);
    const imageUrl = escapeSQLString(p.image_url);
    const slug = escapeSQLString(p.slug);
    const id = escapeSQLString(p.id);
    
    sql += `INSERT INTO products (id, slug, name, category, description, image_url, specs, ai_verdict, lowest_price, highest_price, average_price, deal_score) VALUES (${id}, ${slug}, ${name}, ${category}, ${description}, ${imageUrl}, ${specs}, ${verdict}, ${p.lowest_price || 0}, ${p.highest_price || 0}, ${p.average_price || 0}, ${p.deal_score || 0}) ON CONFLICT (slug) DO NOTHING;\n`;
  }

  return sql;
}
