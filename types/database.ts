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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      cash_reconciliations: {
        Row: {
          actual_cash: number
          closed_by: string | null
          created_at: string
          date: string
          discrepancy: number
          id: string
          notes: string | null
          opening_cash: number
          pharmacy_id: string
          system_cash_expected: number
          updated_at: string
        }
        Insert: {
          actual_cash?: number
          closed_by?: string | null
          created_at?: string
          date: string
          discrepancy?: number
          id?: string
          notes?: string | null
          opening_cash?: number
          pharmacy_id: string
          system_cash_expected?: number
          updated_at?: string
        }
        Update: {
          actual_cash?: number
          closed_by?: string | null
          created_at?: string
          date?: string
          discrepancy?: number
          id?: string
          notes?: string | null
          opening_cash?: number
          pharmacy_id?: string
          system_cash_expected?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_reconciliations_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_reconciliations_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          balance: number
          created_at: string
          credit_limit: number
          email: string | null
          id: string
          name: string
          notes: string | null
          pharmacy_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          balance?: number
          created_at?: string
          credit_limit?: number
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          pharmacy_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          balance?: number
          created_at?: string
          credit_limit?: number
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          pharmacy_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacies: {
        Row: {
          address: string | null
          clerk_org_id: string
          created_at: string
          currency: string
          id: string
          name: string
        }
        Insert: {
          address?: string | null
          clerk_org_id: string
          created_at?: string
          currency?: string
          id?: string
          name: string
        }
        Update: {
          address?: string | null
          clerk_org_id?: string
          created_at?: string
          currency?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      pharmacy_memberships: {
        Row: {
          created_at: string
          id: string
          pharmacy_id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pharmacy_id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pharmacy_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_memberships_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category: string | null
          cost_price: number
          created_at: string
          id: string
          last_delivery: string | null
          last_purchase: string | null
          low_stock_threshold: number
          name: string
          pharmacy_id: string
          sell_price: number
          sku: string | null
          stock: number
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category?: string | null
          cost_price?: number
          created_at?: string
          id?: string
          last_delivery?: string | null
          last_purchase?: string | null
          low_stock_threshold?: number
          name: string
          pharmacy_id: string
          sell_price?: number
          sku?: string | null
          stock?: number
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category?: string | null
          cost_price?: number
          created_at?: string
          id?: string
          last_delivery?: string | null
          last_purchase?: string | null
          low_stock_threshold?: number
          name?: string
          pharmacy_id?: string
          sell_price?: number
          sku?: string | null
          stock?: number
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string
          discount_amount: number
          discount_percent: number
          id: string
          line_subtotal: number
          line_total: number
          product_id: string
          quantity: number
          sale_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          discount_amount?: number
          discount_percent?: number
          id?: string
          line_subtotal: number
          line_total: number
          product_id: string
          quantity: number
          sale_id: string
          unit_price: number
        }
        Update: {
          created_at?: string
          discount_amount?: number
          discount_percent?: number
          id?: string
          line_subtotal?: number
          line_total?: number
          product_id?: string
          quantity?: number
          sale_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          discount_amount: number
          discount_percent: number
          id: string
          line_discount_total: number
          notes: string | null
          payment_type: Database["public"]["Enums"]["payment_type"]
          pharmacy_id: string
          sale_date: string
          subtotal: number
          total_after_discount: number
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          discount_percent?: number
          id?: string
          line_discount_total?: number
          notes?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          pharmacy_id: string
          sale_date?: string
          subtotal?: number
          total_after_discount?: number
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          discount_percent?: number
          id?: string
          line_discount_total?: number
          notes?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          pharmacy_id?: string
          sale_date?: string
          subtotal?: number
          total_after_discount?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          pharmacy_id: string
          product_id: string
          quantity: number
          reference_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          pharmacy_id: string
          product_id: string
          quantity: number
          reference_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          movement_type?: Database["public"]["Enums"]["stock_movement_type"]
          pharmacy_id?: string
          product_id?: string
          quantity?: number
          reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          balance: number
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          pharmacy_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          balance?: number
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          pharmacy_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          balance?: number
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          pharmacy_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          clerk_id: string
          created_at: string
          email: string
          full_name: string | null
          id: string
          pharmacy_id: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          clerk_id: string
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          pharmacy_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          clerk_id?: string
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          pharmacy_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "users_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_sale_with_items: {
        Args: {
          p_client_id?: string
          p_created_by?: string
          p_discount_amount?: number
          p_discount_percent?: number
          p_items: Json
          p_notes?: string
          p_payment_type?: Database["public"]["Enums"]["payment_type"]
          p_pharmacy_id: string
          p_sale_date?: string
        }
        Returns: string
      }
      record_cash_reconciliation: {
        Args: {
          p_actual_cash?: number
          p_closed_by?: string
          p_date?: string
          p_notes?: string
          p_opening_cash?: number
          p_pharmacy_id: string
          p_system_cash_expected?: number
        }
        Returns: {
          actual_cash: number
          closed_by: string | null
          created_at: string
          date: string
          discrepancy: number
          id: string
          notes: string | null
          opening_cash: number
          pharmacy_id: string
          system_cash_expected: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "cash_reconciliations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      payment_type: "cash" | "card" | "credit"
      stock_movement_type: "sale" | "restock" | "adjustment"
      user_role: "owner" | "staff" | "restricted"
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
      payment_type: ["cash", "card", "credit"],
      stock_movement_type: ["sale", "restock", "adjustment"],
      user_role: ["owner", "staff", "restricted"],
    },
  },
} as const
