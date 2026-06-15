export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_cache: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          model: string | null
          product_id: string
          verdict: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          model?: string | null
          product_id: string
          verdict: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          model?: string | null
          product_id?: string
          verdict?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_cache_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_cache_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      api_rate_limits: {
        Row: {
          count: number
          created_at: string
          endpoint: string
          id: number
          identifier: string
          updated_at: string
          window_start: string
        }
        Insert: {
          count?: number
          created_at?: string
          endpoint: string
          id?: number
          identifier: string
          updated_at?: string
          window_start: string
        }
        Update: {
          count?: number
          created_at?: string
          endpoint?: string
          id?: number
          identifier?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      crawl_targets: {
        Row: {
          crawl_status: string | null
          created_at: string | null
          domain: string | null
          error_count: number | null
          error_message: string | null
          id: string
          last_crawled_at: string | null
          last_status_code: number | null
          marketplace_id: string | null
          metadata: Json | null
          next_crawl_at: string | null
          offer_id: string | null
          priority_score: number | null
          product_id: string | null
          source: string | null
          updated_at: string | null
          url: string
        }
        Insert: {
          crawl_status?: string | null
          created_at?: string | null
          domain?: string | null
          error_count?: number | null
          error_message?: string | null
          id?: string
          last_crawled_at?: string | null
          last_status_code?: number | null
          marketplace_id?: string | null
          metadata?: Json | null
          next_crawl_at?: string | null
          offer_id?: string | null
          priority_score?: number | null
          product_id?: string | null
          source?: string | null
          updated_at?: string | null
          url: string
        }
        Update: {
          crawl_status?: string | null
          created_at?: string | null
          domain?: string | null
          error_count?: number | null
          error_message?: string | null
          id?: string
          last_crawled_at?: string | null
          last_status_code?: number | null
          marketplace_id?: string | null
          metadata?: Json | null
          next_crawl_at?: string | null
          offer_id?: string | null
          priority_score?: number | null
          product_id?: string | null
          source?: string | null
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      data_sources: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          priority: number
          rate_limit_per_hour: number | null
          reliability_score: number
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          priority?: number
          rate_limit_per_hour?: number | null
          reliability_score?: number
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          priority?: number
          rate_limit_per_hour?: number | null
          reliability_score?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      ingestion_logs: {
        Row: {
          completed_at: string | null
          data_source_id: string | null
          error_message: string | null
          id: string
          items_created: number
          items_failed: number
          items_processed: number
          items_updated: number
          log_status: string
          marketplace_id: string | null
          metadata: Json | null
          product_id: string | null
          started_at: string
        }
        Insert: {
          completed_at?: string | null
          data_source_id?: string | null
          error_message?: string | null
          id?: string
          items_created?: number
          items_failed?: number
          items_processed?: number
          items_updated?: number
          log_status: string
          marketplace_id?: string | null
          metadata?: Json | null
          product_id?: string | null
          started_at?: string
        }
        Update: {
          completed_at?: string | null
          data_source_id?: string | null
          error_message?: string | null
          id?: string
          items_created?: number
          items_failed?: number
          items_processed?: number
          items_updated?: number
          log_status?: string
          marketplace_id?: string | null
          metadata?: Json | null
          product_id?: string | null
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_logs_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingestion_logs_marketplace_id_fkey"
            columns: ["marketplace_id"]
            isOneToOne: false
            referencedRelation: "marketplaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingestion_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingestion_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplaces: {
        Row: {
          base_url: string
          color: string
          created_at: string | null
          display_name: string
          id: string
          is_active: boolean | null
          name: Database["public"]["Enums"]["marketplace_name"]
        }
        Insert: {
          base_url: string
          color: string
          created_at?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          name: Database["public"]["Enums"]["marketplace_name"]
        }
        Update: {
          base_url?: string
          color?: string
          created_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          name?: Database["public"]["Enums"]["marketplace_name"]
        }
        Relationships: []
      }
      offers: {
        Row: {
          category_hint: string | null
          condition: string
          confidence_label: string | null
          confidence_score: number | null
          created_at: string
          currency: string
          current_price: number
          discount_percentage: number | null
          has_free_shipping: boolean
          has_voucher: boolean
          id: string
          image_url: string | null
          is_active: boolean
          is_official_store: boolean
          last_checked_at: string | null
          marketplace_id: string
          marketplace_product_id: string | null
          original_price: number | null
          product_id: string | null
          rating: number | null
          review_count: number | null
          seller_id: string | null
          seller_location: string | null
          seller_name: string | null
          seller_rating: number | null
          seller_review_count: number | null
          shipping_estimate: number | null
          shipping_info: string | null
          sold_count: number | null
          source: string
          stock_status: string
          title: string | null
          updated_at: string
          url: string
          validation_status: string
          variant: string | null
          voucher_text: string | null
        }
        Insert: {
          category_hint?: string | null
          condition?: string
          confidence_label?: string | null
          confidence_score?: number | null
          created_at?: string
          currency?: string
          current_price: number
          discount_percentage?: number | null
          has_free_shipping?: boolean
          has_voucher?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_official_store?: boolean
          last_checked_at?: string | null
          marketplace_id: string
          marketplace_product_id?: string | null
          original_price?: number | null
          product_id?: string | null
          rating?: number | null
          review_count?: number | null
          seller_id?: string | null
          seller_location?: string | null
          seller_name?: string | null
          seller_rating?: number | null
          seller_review_count?: number | null
          shipping_estimate?: number | null
          shipping_info?: string | null
          sold_count?: number | null
          source?: string
          stock_status?: string
          title?: string | null
          updated_at?: string
          url: string
          validation_status?: string
          variant?: string | null
          voucher_text?: string | null
        }
        Update: {
          category_hint?: string | null
          condition?: string
          confidence_label?: string | null
          confidence_score?: number | null
          created_at?: string
          currency?: string
          current_price?: number
          discount_percentage?: number | null
          has_free_shipping?: boolean
          has_voucher?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_official_store?: boolean
          last_checked_at?: string | null
          marketplace_id?: string
          marketplace_product_id?: string | null
          original_price?: number | null
          product_id?: string | null
          rating?: number | null
          review_count?: number | null
          seller_id?: string | null
          seller_location?: string | null
          seller_name?: string | null
          seller_rating?: number | null
          seller_review_count?: number | null
          shipping_estimate?: number | null
          shipping_info?: string | null
          sold_count?: number | null
          source?: string
          stock_status?: string
          title?: string | null
          updated_at?: string
          url?: string
          validation_status?: string
          variant?: string | null
          voucher_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_marketplace_id_fkey"
            columns: ["marketplace_id"]
            isOneToOne: false
            referencedRelation: "marketplaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      offers_backup_20260612: {
        Row: {
          category_hint: string | null
          confidence_label: string | null
          created_at: string | null
          discount_percentage: number | null
          id: string | null
          image_url: string | null
          in_stock: boolean | null
          marketplace_id: string | null
          original_price: number | null
          price: number | null
          product_id: string | null
          seller_name: string | null
          seller_rating: number | null
          shipping_cost: number | null
          title: string | null
          updated_at: string | null
          url: string | null
          validation_status: string | null
        }
        Insert: {
          category_hint?: string | null
          confidence_label?: string | null
          created_at?: string | null
          discount_percentage?: number | null
          id?: string | null
          image_url?: string | null
          in_stock?: boolean | null
          marketplace_id?: string | null
          original_price?: number | null
          price?: number | null
          product_id?: string | null
          seller_name?: string | null
          seller_rating?: number | null
          shipping_cost?: number | null
          title?: string | null
          updated_at?: string | null
          url?: string | null
          validation_status?: string | null
        }
        Update: {
          category_hint?: string | null
          confidence_label?: string | null
          created_at?: string | null
          discount_percentage?: number | null
          id?: string | null
          image_url?: string | null
          in_stock?: boolean | null
          marketplace_id?: string | null
          original_price?: number | null
          price?: number | null
          product_id?: string | null
          seller_name?: string | null
          seller_rating?: number | null
          shipping_cost?: number | null
          title?: string | null
          updated_at?: string | null
          url?: string | null
          validation_status?: string | null
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          product_id: string
          target_price: number
          triggered_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          product_id: string
          target_price: number
          triggered_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          product_id?: string
          target_price?: number
          triggered_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      price_conflicts: {
        Row: {
          confidence_a: number | null
          confidence_b: number | null
          conflict_status: string
          created_at: string
          id: string
          marketplace_id: string
          offer_a_id: string | null
          offer_b_id: string | null
          price_a: number
          price_b: number
          price_diff_percentage: number
          product_id: string
          resolution_note: string | null
          resolved_at: string | null
          source_a: string | null
          source_b: string | null
        }
        Insert: {
          confidence_a?: number | null
          confidence_b?: number | null
          conflict_status?: string
          created_at?: string
          id?: string
          marketplace_id: string
          offer_a_id?: string | null
          offer_b_id?: string | null
          price_a: number
          price_b: number
          price_diff_percentage: number
          product_id: string
          resolution_note?: string | null
          resolved_at?: string | null
          source_a?: string | null
          source_b?: string | null
        }
        Update: {
          confidence_a?: number | null
          confidence_b?: number | null
          conflict_status?: string
          created_at?: string
          id?: string
          marketplace_id?: string
          offer_a_id?: string | null
          offer_b_id?: string | null
          price_a?: number
          price_b?: number
          price_diff_percentage?: number
          product_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          source_a?: string | null
          source_b?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_conflicts_marketplace_id_fkey"
            columns: ["marketplace_id"]
            isOneToOne: false
            referencedRelation: "marketplaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_conflicts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_conflicts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      price_history: {
        Row: {
          created_at: string | null
          id: string
          marketplace_id: string
          price: number
          product_id: string
          recorded_at: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          marketplace_id: string
          price: number
          product_id: string
          recorded_at?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          marketplace_id?: string
          price?: number
          product_id?: string
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_history_marketplace_id_fkey"
            columns: ["marketplace_id"]
            isOneToOne: false
            referencedRelation: "marketplaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      price_reports: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          offer_id: string | null
          product_id: string | null
          report_status: string | null
          report_type: string | null
          reported_price: number | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          offer_id?: string | null
          product_id?: string | null
          report_status?: string | null
          report_type?: string | null
          reported_price?: number | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          offer_id?: string | null
          product_id?: string | null
          report_status?: string | null
          report_type?: string | null
          reported_price?: number | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      price_snapshots: {
        Row: {
          captured_at: string
          confidence_score: number | null
          current_price: number
          discount_percent: number | null
          id: string
          offer_id: string
          original_price: number | null
          shipping_estimate: number | null
          source: string
          stock_status: string
          voucher_text: string | null
        }
        Insert: {
          captured_at?: string
          confidence_score?: number | null
          current_price: number
          discount_percent?: number | null
          id?: string
          offer_id: string
          original_price?: number | null
          shipping_estimate?: number | null
          source?: string
          stock_status?: string
          voucher_text?: string | null
        }
        Update: {
          captured_at?: string
          confidence_score?: number | null
          current_price?: number
          discount_percent?: number | null
          id?: string
          offer_id?: string
          original_price?: number | null
          shipping_estimate?: number | null
          source?: string
          stock_status?: string
          voucher_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_snapshots_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      prices: {
        Row: {
          created_at: string | null
          id: string
          in_stock: boolean | null
          last_updated: string | null
          marketplace_id: string
          price: number
          product_id: string
          seller: string | null
          seller_rating: number | null
          shipping_cost: number | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          in_stock?: boolean | null
          last_updated?: string | null
          marketplace_id: string
          price: number
          product_id: string
          seller?: string | null
          seller_rating?: number | null
          shipping_cost?: number | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          in_stock?: boolean | null
          last_updated?: string | null
          marketplace_id?: string
          price?: number
          product_id?: string
          seller?: string | null
          seller_rating?: number | null
          shipping_cost?: number | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prices_marketplace_id_fkey"
            columns: ["marketplace_id"]
            isOneToOne: false
            referencedRelation: "marketplaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          ai_verdict: string | null
          average_price: number | null
          category: string
          created_at: string | null
          deal_score: number | null
          description: string | null
          highest_price: number | null
          id: string
          image_url: string | null
          lowest_price: number | null
          name: string
          slug: string
          specs: Json | null
          updated_at: string | null
        }
        Insert: {
          ai_verdict?: string | null
          average_price?: number | null
          category: string
          created_at?: string | null
          deal_score?: number | null
          description?: string | null
          highest_price?: number | null
          id?: string
          image_url?: string | null
          lowest_price?: number | null
          name: string
          slug: string
          specs?: Json | null
          updated_at?: string | null
        }
        Update: {
          ai_verdict?: string | null
          average_price?: number | null
          category?: string
          created_at?: string | null
          deal_score?: number | null
          description?: string | null
          highest_price?: number | null
          id?: string
          image_url?: string | null
          lowest_price?: number | null
          name?: string
          slug?: string
          specs?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      recheck_requests: {
        Row: {
          created_at: string | null
          id: string
          offer_id: string | null
          priority_score: number | null
          processed_at: string | null
          product_id: string | null
          reason: string | null
          request_status: string | null
          requested_by: string | null
          result_message: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          offer_id?: string | null
          priority_score?: number | null
          processed_at?: string | null
          product_id?: string | null
          reason?: string | null
          request_status?: string | null
          requested_by?: string | null
          result_message?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          offer_id?: string | null
          priority_score?: number | null
          processed_at?: string | null
          product_id?: string | null
          reason?: string | null
          request_status?: string | null
          requested_by?: string | null
          result_message?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          id: string
          preferences: Json | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          preferences?: Json | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          preferences?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      product_summary: {
        Row: {
          average_price: number | null
          category: string | null
          deal_score: number | null
          highest_price: number | null
          id: string | null
          image_url: string | null
          in_stock_count: number | null
          lowest_price: number | null
          marketplace_count: number | null
          name: string | null
          slug: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      increment_rate_limit: {
        Args: {
          p_endpoint: string
          p_identifier: string
          p_limit: number
          p_window_start: string
        }
        Returns: {
          allowed: boolean
          current_count: number
          remaining: number
        }[]
      }
    }
    Enums: {
      marketplace_name:
        | "tokopedia"
        | "shopee"
        | "bukalapak"
        | "lazada"
        | "blibli"
        | "tiktok"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      marketplace_name: [
        "tokopedia",
        "shopee",
        "bukalapak",
        "lazada",
        "blibli",
        "tiktok",
      ],
    },
  },
} as const
