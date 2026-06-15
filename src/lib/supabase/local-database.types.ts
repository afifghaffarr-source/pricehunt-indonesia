/**
 * Local Supabase Database type — covers tables read/written by app code that
 * aren't yet in the generated `database.types.ts` (Phase 5 backlog).
 *
 * Keep this in sync with:
 *   - supabase/migrations/107_normalize_prices_to_offers.sql
 *   - supabase/migrations/108_price_snapshots.sql
 *   - supabase/migrations/124_offers_additive_migration.sql
 *
 * When `supabase gen types typescript` runs (needs SUPABASE_ACCESS_TOKEN),
 * these entries can be merged into the generated file and this file deleted.
 *
 * Schema source-of-truth: src/lib/supabase/offers.ts (Offer, PriceSnapshot)
 */

export interface LocalDatabase {
  public: {
    Tables: {
      offers: {
        Row: {
          id: string;
          product_id: string;
          marketplace_id: string;
          marketplace_product_id: string | null;
          title: string;
          seller_name: string | null;
          seller_id: string | null;
          seller_rating: number | null;
          seller_review_count: number | null;
          seller_location: string | null;
          is_official_store: boolean;
          condition: "new" | "used" | "refurbished" | "unknown";
          variant: string | null;
          url: string;
          current_price: number;
          original_price: number | null;
          discount_percentage: number | null;
          stock_status: "in_stock" | "low_stock" | "out_of_stock" | "unknown";
          shipping_estimate: number | null;
          shipping_info: string | null;
          sold_count: number | null;
          voucher_text: string | null;
          has_voucher: boolean;
          has_free_shipping: boolean;
          image_url: string | null;
          category_hint: string | null;
          source: string;
          confidence_score: number;
          confidence_label: string;
          validation_status: "pending" | "verified" | "flagged" | "rejected";
          is_active: boolean;
          last_checked_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          marketplace_id: string;
          marketplace_product_id?: string | null;
          title: string;
          seller_name?: string | null;
          seller_id?: string | null;
          seller_rating?: number | null;
          seller_review_count?: number | null;
          seller_location?: string | null;
          is_official_store?: boolean;
          condition?: "new" | "used" | "refurbished" | "unknown";
          variant?: string | null;
          url: string;
          current_price: number;
          original_price?: number | null;
          discount_percentage?: number | null;
          stock_status?: "in_stock" | "low_stock" | "out_of_stock" | "unknown";
          shipping_estimate?: number | null;
          shipping_info?: string | null;
          sold_count?: number | null;
          voucher_text?: string | null;
          has_voucher?: boolean;
          has_free_shipping?: boolean;
          image_url?: string | null;
          category_hint?: string | null;
          source?: string;
          confidence_score?: number;
          confidence_label?: string;
          validation_status?: "pending" | "verified" | "flagged" | "rejected";
          is_active?: boolean;
          last_checked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          id: string;
          product_id: string;
          marketplace_id: string;
          marketplace_product_id: string | null;
          title: string;
          seller_name: string | null;
          seller_id: string | null;
          seller_rating: number | null;
          seller_review_count: number | null;
          seller_location: string | null;
          is_official_store: boolean;
          condition: "new" | "used" | "refurbished" | "unknown";
          variant: string | null;
          url: string;
          current_price: number;
          original_price: number | null;
          discount_percentage: number | null;
          stock_status: "in_stock" | "low_stock" | "out_of_stock" | "unknown";
          shipping_estimate: number | null;
          shipping_info: string | null;
          sold_count: number | null;
          voucher_text: string | null;
          has_voucher: boolean;
          has_free_shipping: boolean;
          image_url: string | null;
          category_hint: string | null;
          source: string;
          confidence_score: number;
          confidence_label: string;
          validation_status: "pending" | "verified" | "flagged" | "rejected";
          is_active: boolean;
          last_checked_at: string | null;
          created_at: string;
          updated_at: string;
        }>;
      };
      price_snapshots: {
        Row: {
          id: string;
          offer_id: string;
          price: number;
          original_price: number | null;
          discount_percent: number | null;
          captured_at: string;
          source: string;
          confidence_score: number | null;
        };
        Insert: {
          id?: string;
          offer_id: string;
          price: number;
          original_price?: number | null;
          discount_percent?: number | null;
          captured_at?: string;
          source?: string;
          confidence_score?: number | null;
        };
        Update: Partial<{
          id: string;
          offer_id: string;
          price: number;
          original_price: number | null;
          discount_percent: number | null;
          captured_at: string;
          source: string;
          confidence_score: number | null;
        }>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
