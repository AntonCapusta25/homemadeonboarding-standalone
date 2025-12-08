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
      chef_profiles: {
        Row: {
          address: string | null
          availability: string[] | null
          business_name: string | null
          chef_name: string | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          cuisines: string[] | null
          dish_types: string[] | null
          food_safety_status:
            | Database["public"]["Enums"]["food_safety_status"]
            | null
          id: string
          kvk_status: Database["public"]["Enums"]["kvk_status"] | null
          logo_url: string | null
          onboarding_completed: boolean | null
          plan: Database["public"]["Enums"]["plan_type"] | null
          service_type: Database["public"]["Enums"]["service_type"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          availability?: string[] | null
          business_name?: string | null
          chef_name?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          cuisines?: string[] | null
          dish_types?: string[] | null
          food_safety_status?:
            | Database["public"]["Enums"]["food_safety_status"]
            | null
          id?: string
          kvk_status?: Database["public"]["Enums"]["kvk_status"] | null
          logo_url?: string | null
          onboarding_completed?: boolean | null
          plan?: Database["public"]["Enums"]["plan_type"] | null
          service_type?: Database["public"]["Enums"]["service_type"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          availability?: string[] | null
          business_name?: string | null
          chef_name?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          cuisines?: string[] | null
          dish_types?: string[] | null
          food_safety_status?:
            | Database["public"]["Enums"]["food_safety_status"]
            | null
          id?: string
          kvk_status?: Database["public"]["Enums"]["kvk_status"] | null
          logo_url?: string | null
          onboarding_completed?: boolean | null
          plan?: Database["public"]["Enums"]["plan_type"] | null
          service_type?: Database["public"]["Enums"]["service_type"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dishes: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          estimated_cost: number | null
          id: string
          is_upsell: boolean | null
          margin: number | null
          menu_id: string
          name: string
          price: number
          restaurant_comparison_price: number | null
          sort_order: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          estimated_cost?: number | null
          id?: string
          is_upsell?: boolean | null
          margin?: number | null
          menu_id: string
          name: string
          price: number
          restaurant_comparison_price?: number | null
          sort_order?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          estimated_cost?: number | null
          id?: string
          is_upsell?: boolean | null
          margin?: number | null
          menu_id?: string
          name?: string
          price?: number
          restaurant_comparison_price?: number | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dishes_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
        ]
      }
      menus: {
        Row: {
          average_margin: number | null
          chef_profile_id: string
          created_at: string
          id: string
          is_active: boolean | null
          summary: string | null
          updated_at: string
        }
        Insert: {
          average_margin?: number | null
          chef_profile_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          summary?: string | null
          updated_at?: string
        }
        Update: {
          average_margin?: number | null
          chef_profile_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menus_chef_profile_id_fkey"
            columns: ["chef_profile_id"]
            isOneToOne: false
            referencedRelation: "chef_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          cached_at: string
          city: string
          id: string
          name: string
          type: string | null
          url: string | null
        }
        Insert: {
          cached_at?: string
          city: string
          id?: string
          name: string
          type?: string | null
          url?: string | null
        }
        Update: {
          cached_at?: string
          city?: string
          id?: string
          name?: string
          type?: string | null
          url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      food_safety_status:
        | "have_certificate"
        | "getting_certificate"
        | "need_help"
      kvk_status: "have_both" | "in_progress" | "need_help"
      plan_type: "starter" | "growth" | "pro"
      service_type: "delivery" | "pickup" | "both" | "unsure"
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
      food_safety_status: [
        "have_certificate",
        "getting_certificate",
        "need_help",
      ],
      kvk_status: ["have_both", "in_progress", "need_help"],
      plan_type: ["starter", "growth", "pro"],
      service_type: ["delivery", "pickup", "both", "unsure"],
    },
  },
} as const
