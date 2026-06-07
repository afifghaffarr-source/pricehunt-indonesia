import { createClient } from "@/lib/supabase/server";

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
    sql += `INSERT INTO marketplaces (id, name, display_name, base_url, color) VALUES ('${mp.id}', '${mp.name}', '${mp.display_name}', '${mp.base_url}', '${mp.color}') ON CONFLICT (name) DO NOTHING;\n`;
  }

  sql += "\n-- Products\n";
  for (const p of (backup.data.products || []) as Record<string, unknown>[]) {
    const specs = typeof p.specs === "object" ? JSON.stringify(p.specs).replace(/'/g, "''") : "{}";
    const verdict = (p.ai_verdict as string || "").replace(/'/g, "''");
    sql += `INSERT INTO products (id, slug, name, category, description, image_url, specs, ai_verdict, lowest_price, highest_price, average_price, deal_score) VALUES ('${p.id}', '${p.slug}', '${(p.name as string).replace(/'/g, "''")}', '${p.category}', '${(p.description as string || "").replace(/'/g, "''")}', '${p.image_url}', '${specs}', '${verdict}', ${p.lowest_price || 0}, ${p.highest_price || 0}, ${p.average_price || 0}, ${p.deal_score || 0}) ON CONFLICT (slug) DO NOTHING;\n`;
  }

  return sql;
}
