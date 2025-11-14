export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
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
      }
    }
    Enums: {
      user_role: "owner" | "staff" | "restricted"
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
  }
}
