import { describe, it, expect } from "vitest";
import { generateSeedSQL, type BackupData } from "@/lib/backup";

/**
 * Tests for generateSeedSQL — pure function, no Supabase needed.
 *
 * The function should:
 * - Generate idempotent SQL (ON CONFLICT DO NOTHING)
 * - Wrap in BEGIN/COMMIT transaction
 * - Insert in dependency order (marketplaces → products → offers → price_snapshots)
 * - Handle null values safely
 * - Escape special characters (quotes, backslashes, null bytes)
 * - Include stats header
 */
describe("generateSeedSQL", () => {
  const sampleBackup: BackupData = {
    timestamp: "2026-06-15T12-00-00-000Z",
    data: {
      marketplaces: [
        {
          id: "mp-1",
          name: "tokopedia",
          display_name: "Tokopedia",
          base_url: "https://tokopedia.com",
          color: "#42B549",
          is_active: true,
          created_at: null,
        },
      ],
      products: [
        {
          id: "p-1",
          slug: "iphone-15",
          name: "iPhone 15",
          category: "Smartphone",
          description: "Latest iPhone",
          image_url: "https://example.com/img.jpg",
          specs: { color: "black", storage: "128GB" },
          ai_verdict: "good deal",
          lowest_price: 12000000,
          highest_price: 15000000,
          average_price: 13500000,
          deal_score: 85,
          created_at: null,
          updated_at: null,
        },
      ],
      offers: [
        {
          id: "o-1",
          product_id: "p-1",
          marketplace_id: "mp-1",
          marketplace_product_id: "ABC123",
          title: "iPhone 15 128GB",
          url: "https://tokopedia.com/p/iphone-15",
          image_url: null,
          current_price: 12000000,
          original_price: 15000000,
          discount_percentage: 20,
          stock_status: "in_stock",
          is_active: true,
          seller_name: "Apple Official",
          seller_id: null,
          seller_rating: 4.9,
          seller_review_count: 1000,
          seller_location: "Jakarta",
          is_official_store: true,
          condition: "new",
          variant: "128GB",
          shipping_estimate: 0,
          shipping_info: null,
          has_free_shipping: true,
          has_voucher: false,
          voucher_text: null,
          sold_count: 50,
          source: "scrape",
          confidence_score: 95,
          confidence_label: "high",
          validation_status: "verified",
          last_checked_at: null,
          category_hint: "Smartphone",
          rating: 4.8,
          review_count: 200,
          currency: "IDR",
          created_at: "2026-06-15T10:00:00Z",
          updated_at: "2026-06-15T10:00:00Z",
        },
      ],
      price_snapshots: [
        {
          id: "s-1",
          offer_id: "o-1",
          current_price: 12000000,
          original_price: 15000000,
          discount_percent: 20,
          stock_status: "in_stock",
          voucher_text: null,
          shipping_estimate: 0,
          source: "scrape",
          confidence_score: 95,
          captured_at: "2026-06-15T10:00:00Z",
        },
      ],
    },
    stats: {
      products: 1,
      marketplaces: 1,
      offers: 1,
      price_snapshots: 1,
    },
  };

  it("generates valid header with stats", () => {
    const sql = generateSeedSQL(sampleBackup);
    expect(sql).toContain("-- BijakBeli Auto-Generated Seed");
    expect(sql).toContain("Generated:");
    expect(sql).toContain("Source timestamp: 2026-06-15T12-00-00-000Z");
    expect(sql).toContain("Stats: 1 products, 1 marketplaces, 1 offers, 1 price_snapshots");
  });

  it("wraps inserts in transaction", () => {
    const sql = generateSeedSQL(sampleBackup);
    expect(sql).toContain("BEGIN;");
    expect(sql.trim().endsWith("COMMIT;")).toBe(true);
  });

  it("uses ON CONFLICT DO NOTHING for idempotency", () => {
    const sql = generateSeedSQL(sampleBackup);
    const insertCount = (sql.match(/INSERT INTO/g) || []).length;
    const conflictCount = (sql.match(/ON CONFLICT[\s(]+.+DO NOTHING/g) || []).length;
    expect(insertCount).toBe(conflictCount);
    expect(insertCount).toBeGreaterThan(0);
  });

  it("inserts in dependency order (marketplaces first, price_snapshots last)", () => {
    const sql = generateSeedSQL(sampleBackup);
    const mpIdx = sql.indexOf("-- Marketplaces");
    const prodIdx = sql.indexOf("-- Products");
    const offerIdx = sql.indexOf("-- Offers");
    const snapIdx = sql.indexOf("-- Price snapshots");
    expect(mpIdx).toBeLessThan(prodIdx);
    expect(prodIdx).toBeLessThan(offerIdx);
    expect(offerIdx).toBeLessThan(snapIdx);
  });

  it("escapes single quotes in product names", () => {
    const tricky: BackupData = {
      ...sampleBackup,
      data: {
        ...sampleBackup.data,
        products: [
          {
            ...sampleBackup.data.products[0],
            name: "Apple's iPhone '15'",
          },
        ],
      },
    };
    const sql = generateSeedSQL(tricky);
    // Should double the single quotes per PostgreSQL convention
    expect(sql).toContain("'Apple''s iPhone ''15'''");
  });

  it("escapes backslashes in strings", () => {
    const tricky: BackupData = {
      ...sampleBackup,
      data: {
        ...sampleBackup.data,
        products: [
          {
            ...sampleBackup.data.products[0],
            description: "C:\\Users\\test",
          },
        ],
      },
    };
    const sql = generateSeedSQL(tricky);
    expect(sql).toContain("'C:\\\\Users\\\\test'");
  });

  it("removes null bytes from strings", () => {
    const tricky: BackupData = {
      ...sampleBackup,
      data: {
        ...sampleBackup.data,
        products: [
          {
            ...sampleBackup.data.products[0],
            name: "iPhone\0 15",
          },
        ],
      },
    };
    const sql = generateSeedSQL(tricky);
    expect(sql).not.toContain("\0");
    expect(sql).toContain("'iPhone 15'");
  });

  it("serializes specs JSONB correctly", () => {
    const sql = generateSeedSQL(sampleBackup);
    // specs is an object, should be JSON-stringified
    expect(sql).toContain('{"color":"black","storage":"128GB"}');
  });

  it("handles empty data gracefully", () => {
    const empty: BackupData = {
      timestamp: "2026-06-15T12-00-00-000Z",
      data: { products: [], marketplaces: [], offers: [], price_snapshots: [] },
      stats: { products: 0, marketplaces: 0, offers: 0, price_snapshots: 0 },
    };
    const sql = generateSeedSQL(empty);
    expect(sql).toContain("Stats: 0 products, 0 marketplaces, 0 offers, 0 price_snapshots");
    // No INSERTs should be generated
    expect((sql.match(/INSERT INTO/g) || []).length).toBe(0);
  });

  it("preserves the new schema (offers + price_snapshots, NOT legacy prices + price_history)", () => {
    const sql = generateSeedSQL(sampleBackup);
    expect(sql).toContain("INSERT INTO offers");
    expect(sql).toContain("INSERT INTO price_snapshots");
    expect(sql).not.toContain("INSERT INTO prices");
    expect(sql).not.toContain("INSERT INTO price_history");
  });
});
