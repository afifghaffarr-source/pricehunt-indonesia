export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type MarketplaceName =
  | "tokopedia"
  | "shopee"
  | "bukalapak"
  | "lazada"
  | "blibli"
  | "tiktok";

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          slug: string;
          name: string;
          category: string;
          description: string | null;
          image_url: string | null;
          specs: Json;
          ai_verdict: string | null;
          lowest_price: number | null;
          highest_price: number | null;
          average_price: number | null;
          deal_score: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          category: string;
          description?: string | null;
          image_url?: string | null;
          specs?: Json;
          ai_verdict?: string | null;
          lowest_price?: number | null;
          highest_price?: number | null;
          average_price?: number | null;
          deal_score?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          category?: string;
          description?: string | null;
          image_url?: string | null;
          specs?: Json;
          ai_verdict?: string | null;
          lowest_price?: number | null;
          highest_price?: number | null;
          average_price?: number | null;
          deal_score?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      marketplaces: {
        Row: {
          id: string;
          name: MarketplaceName;
          display_name: string;
          base_url: string;
          color: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: MarketplaceName;
          display_name: string;
          base_url: string;
          color: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: MarketplaceName;
          display_name?: string;
          base_url?: string;
          color?: string;
          is_active?: boolean;
          created_at?: string;
        };
      };
      prices: {
        Row: {
          id: string;
          product_id: string;
          marketplace_id: string;
          price: number;
          url: string | null;
          seller: string | null;
          seller_rating: number | null;
          in_stock: boolean;
          shipping_cost: number;
          last_updated: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          marketplace_id: string;
          price: number;
          url?: string | null;
          seller?: string | null;
          seller_rating?: number | null;
          in_stock?: boolean;
          shipping_cost?: number;
          last_updated?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          marketplace_id?: string;
          price?: number;
          url?: string | null;
          seller?: string | null;
          seller_rating?: number | null;
          in_stock?: boolean;
          shipping_cost?: number;
          last_updated?: string;
          created_at?: string;
        };
      };
      price_history: {
        Row: {
          id: string;
          product_id: string;
          marketplace_id: string;
          price: number;
          recorded_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          marketplace_id: string;
          price: number;
          recorded_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          marketplace_id?: string;
          price?: number;
          recorded_at?: string;
          created_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      wishlists: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          created_at?: string;
        };
      };
      price_alerts: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          target_price: number;
          is_active: boolean;
          triggered_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          target_price: number;
          is_active?: boolean;
          triggered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          target_price?: number;
          is_active?: boolean;
          triggered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      ai_cache: {
        Row: {
          id: string;
          product_id: string;
          verdict: string;
          model: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          verdict: string;
          model?: string;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          verdict?: string;
          model?: string;
          expires_at?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      product_summary: {
        Row: {
          id: string;
          slug: string;
          name: string;
          category: string;
          image_url: string | null;
          deal_score: number;
          lowest_price: number | null;
          highest_price: number | null;
          average_price: number | null;
          marketplace_count: number;
          in_stock_count: number;
        };
      };
    };
  };
}
