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
      chef_activities: {
        Row: {
          activity_type: string
          admin_name: string | null
          admin_user_id: string | null
          chef_id: string
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          activity_type: string
          admin_name?: string | null
          admin_user_id?: string | null
          chef_id: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          activity_type?: string
          admin_name?: string | null
          admin_user_id?: string | null
          chef_id?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chef_activities_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chef_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_admin_data: {
        Row: {
          admin_notes: string | null
          admin_status: string | null
          assigned_admin_id: string | null
          call_attempts: number | null
          chef_profile_id: string
          created_at: string
          crm_follow_up_date: string | null
          crm_last_contact_date: string | null
          crm_updated_by: string | null
          id: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          admin_status?: string | null
          assigned_admin_id?: string | null
          call_attempts?: number | null
          chef_profile_id: string
          created_at?: string
          crm_follow_up_date?: string | null
          crm_last_contact_date?: string | null
          crm_updated_by?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          admin_status?: string | null
          assigned_admin_id?: string | null
          call_attempts?: number | null
          chef_profile_id?: string
          created_at?: string
          crm_follow_up_date?: string | null
          crm_last_contact_date?: string | null
          crm_updated_by?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_admin_data_chef_profile_id_fkey"
            columns: ["chef_profile_id"]
            isOneToOne: true
            referencedRelation: "chef_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
          hyperzod_merchant_id: string | null
          id: string
          kvk_status: Database["public"]["Enums"]["kvk_status"] | null
          logo_url: string | null
          onboarding_completed: boolean | null
          onboarding_reminder_sent_at: string | null
          plan: Database["public"]["Enums"]["plan_type"] | null
          service_type: Database["public"]["Enums"]["service_type"] | null
          tos_accepted_at: string | null
          tos_plan_accepted: string | null
          tos_signature: string | null
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
          hyperzod_merchant_id?: string | null
          id?: string
          kvk_status?: Database["public"]["Enums"]["kvk_status"] | null
          logo_url?: string | null
          onboarding_completed?: boolean | null
          onboarding_reminder_sent_at?: string | null
          plan?: Database["public"]["Enums"]["plan_type"] | null
          service_type?: Database["public"]["Enums"]["service_type"] | null
          tos_accepted_at?: string | null
          tos_plan_accepted?: string | null
          tos_signature?: string | null
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
          hyperzod_merchant_id?: string | null
          id?: string
          kvk_status?: Database["public"]["Enums"]["kvk_status"] | null
          logo_url?: string | null
          onboarding_completed?: boolean | null
          onboarding_reminder_sent_at?: string | null
          plan?: Database["public"]["Enums"]["plan_type"] | null
          service_type?: Database["public"]["Enums"]["service_type"] | null
          tos_accepted_at?: string | null
          tos_plan_accepted?: string | null
          tos_signature?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chef_verification: {
        Row: {
          chef_profile_id: string
          created_at: string
          documents_uploaded: boolean | null
          food_safety_followup_sent: boolean | null
          food_safety_quiz_completed: boolean | null
          food_safety_quiz_completed_at: string | null
          food_safety_quiz_passed: boolean | null
          food_safety_quiz_score: number | null
          food_safety_skipped_at: string | null
          food_safety_viewed: boolean | null
          haccp_document_url: string | null
          id: string
          kvk_document_url: string | null
          menu_reviewed: boolean | null
          nvwa_document_url: string | null
          updated_at: string
          verification_completed: boolean | null
        }
        Insert: {
          chef_profile_id: string
          created_at?: string
          documents_uploaded?: boolean | null
          food_safety_followup_sent?: boolean | null
          food_safety_quiz_completed?: boolean | null
          food_safety_quiz_completed_at?: string | null
          food_safety_quiz_passed?: boolean | null
          food_safety_quiz_score?: number | null
          food_safety_skipped_at?: string | null
          food_safety_viewed?: boolean | null
          haccp_document_url?: string | null
          id?: string
          kvk_document_url?: string | null
          menu_reviewed?: boolean | null
          nvwa_document_url?: string | null
          updated_at?: string
          verification_completed?: boolean | null
        }
        Update: {
          chef_profile_id?: string
          created_at?: string
          documents_uploaded?: boolean | null
          food_safety_followup_sent?: boolean | null
          food_safety_quiz_completed?: boolean | null
          food_safety_quiz_completed_at?: string | null
          food_safety_quiz_passed?: boolean | null
          food_safety_quiz_score?: number | null
          food_safety_skipped_at?: string | null
          food_safety_viewed?: boolean | null
          haccp_document_url?: string | null
          id?: string
          kvk_document_url?: string | null
          menu_reviewed?: boolean | null
          nvwa_document_url?: string | null
          updated_at?: string
          verification_completed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "chef_verification_chef_profile_id_fkey"
            columns: ["chef_profile_id"]
            isOneToOne: true
            referencedRelation: "chef_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dishes: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          estimated_cost: number | null
          id: string
          image_url: string | null
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
          image_url?: string | null
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
          image_url?: string | null
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
      merchant_setup_jobs: {
        Row: {
          ambience: string | null
          background_style: string | null
          chef_profile_id: string
          completed_at: string | null
          created_at: string | null
          current_step: string | null
          dishes_imported: number | null
          error_message: string | null
          id: string
          images_generated: number | null
          merchant_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          ambience?: string | null
          background_style?: string | null
          chef_profile_id: string
          completed_at?: string | null
          created_at?: string | null
          current_step?: string | null
          dishes_imported?: number | null
          error_message?: string | null
          id?: string
          images_generated?: number | null
          merchant_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          ambience?: string | null
          background_style?: string | null
          chef_profile_id?: string
          completed_at?: string | null
          created_at?: string | null
          current_step?: string | null
          dishes_imported?: number | null
          error_message?: string | null
          id?: string
          images_generated?: number | null
          merchant_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_setup_jobs_chef_profile_id_fkey"
            columns: ["chef_profile_id"]
            isOneToOne: false
            referencedRelation: "chef_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_profiles: {
        Row: {
          address: string | null
          availability: string[] | null
          business_name: string | null
          chef_name: string | null
          city: string | null
          created_at: string
          cuisines: string[] | null
          current_step: string | null
          dish_types: string[] | null
          email: string
          expires_at: string
          food_safety_status:
            | Database["public"]["Enums"]["food_safety_status"]
            | null
          id: string
          kvk_status: Database["public"]["Enums"]["kvk_status"] | null
          logo_url: string | null
          onboarding_reminder_sent_at: string | null
          phone: string | null
          plan: Database["public"]["Enums"]["plan_type"] | null
          service_type: Database["public"]["Enums"]["service_type"] | null
          session_token: string | null
        }
        Insert: {
          address?: string | null
          availability?: string[] | null
          business_name?: string | null
          chef_name?: string | null
          city?: string | null
          created_at?: string
          cuisines?: string[] | null
          current_step?: string | null
          dish_types?: string[] | null
          email: string
          expires_at?: string
          food_safety_status?:
            | Database["public"]["Enums"]["food_safety_status"]
            | null
          id?: string
          kvk_status?: Database["public"]["Enums"]["kvk_status"] | null
          logo_url?: string | null
          onboarding_reminder_sent_at?: string | null
          phone?: string | null
          plan?: Database["public"]["Enums"]["plan_type"] | null
          service_type?: Database["public"]["Enums"]["service_type"] | null
          session_token?: string | null
        }
        Update: {
          address?: string | null
          availability?: string[] | null
          business_name?: string | null
          chef_name?: string | null
          city?: string | null
          created_at?: string
          cuisines?: string[] | null
          current_step?: string | null
          dish_types?: string[] | null
          email?: string
          expires_at?: string
          food_safety_status?:
            | Database["public"]["Enums"]["food_safety_status"]
            | null
          id?: string
          kvk_status?: Database["public"]["Enums"]["kvk_status"] | null
          logo_url?: string | null
          onboarding_reminder_sent_at?: string | null
          phone?: string | null
          plan?: Database["public"]["Enums"]["plan_type"] | null
          service_type?: Database["public"]["Enums"]["service_type"] | null
          session_token?: string | null
        }
        Relationships: []
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
      user_roles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "chef"
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
      app_role: ["admin", "chef"],
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
