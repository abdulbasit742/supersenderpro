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
      audit_events: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          severity: Database["public"]["Enums"]["audit_severity"]
          target: string | null
          target_type: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          severity?: Database["public"]["Enums"]["audit_severity"]
          target?: string | null
          target_type?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          severity?: Database["public"]["Enums"]["audit_severity"]
          target?: string | null
          target_type?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      channel_items: {
        Row: {
          ai_content: string | null
          content: string | null
          fetched_at: string
          id: string
          media_type: string | null
          media_urls: string[] | null
          post_id: string | null
          published_at: string | null
          remote_id: string
          source_id: string
          status: string
          user_id: string
        }
        Insert: {
          ai_content?: string | null
          content?: string | null
          fetched_at?: string
          id?: string
          media_type?: string | null
          media_urls?: string[] | null
          post_id?: string | null
          published_at?: string | null
          remote_id: string
          source_id: string
          status?: string
          user_id: string
        }
        Update: {
          ai_content?: string | null
          content?: string | null
          fetched_at?: string
          id?: string
          media_type?: string | null
          media_urls?: string[] | null
          post_id?: string | null
          published_at?: string | null
          remote_id?: string
          source_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_items_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_items_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "channel_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_sources: {
        Row: {
          ai_rewrite: boolean
          auto_publish: boolean
          bot_account_id: string | null
          created_at: string
          id: string
          identifier: string
          is_active: boolean
          kind: string
          last_update_id: number | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_rewrite?: boolean
          auto_publish?: boolean
          bot_account_id?: string | null
          created_at?: string
          id?: string
          identifier: string
          is_active?: boolean
          kind?: string
          last_update_id?: number | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_rewrite?: boolean
          auto_publish?: boolean
          bot_account_id?: string | null
          created_at?: string
          id?: string
          identifier?: string
          is_active?: boolean
          kind?: string
          last_update_id?: number | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_sources_bot_account_id_fkey"
            columns: ["bot_account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          contact_name: string
          contact_phone: string | null
          created_at: string
          id: string
          intent: string | null
          last_message: string | null
          last_message_at: string | null
          status: string
          unread_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          intent?: string | null
          last_message?: string | null
          last_message_at?: string | null
          status?: string
          unread_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          intent?: string | null
          last_message?: string | null
          last_message_at?: string | null
          status?: string
          unread_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ecommerce_accounts: {
        Row: {
          access_token: string | null
          api_key: string | null
          api_secret: string | null
          created_at: string
          id: string
          is_active: boolean
          meta: Json | null
          platform: string
          refresh_token: string | null
          shop_id: string | null
          shop_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          api_key?: string | null
          api_secret?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          meta?: Json | null
          platform: string
          refresh_token?: string | null
          shop_id?: string | null
          shop_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          api_key?: string | null
          api_secret?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          meta?: Json | null
          platform?: string
          refresh_token?: string | null
          shop_id?: string | null
          shop_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      marketplace_listings: {
        Row: {
          created_at: string
          id: string
          last_synced_at: string | null
          listing_id: string | null
          listing_url: string | null
          platform: string
          product_id: string
          status: string
          sync_errors: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_synced_at?: string | null
          listing_id?: string | null
          listing_url?: string | null
          platform: string
          product_id: string
          status?: string
          sync_errors?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_synced_at?: string | null
          listing_id?: string | null
          listing_url?: string | null
          platform?: string
          product_id?: string
          status?: string
          sync_errors?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          sender: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          sender: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      post_targets: {
        Row: {
          attempted_at: string | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          platform: Database["public"]["Enums"]["social_platform"]
          post_id: string
          remote_post_id: string | null
          remote_url: string | null
          social_account_id: string
          status: Database["public"]["Enums"]["target_status"]
        }
        Insert: {
          attempted_at?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          platform: Database["public"]["Enums"]["social_platform"]
          post_id: string
          remote_post_id?: string | null
          remote_url?: string | null
          social_account_id: string
          status?: Database["public"]["Enums"]["target_status"]
        }
        Update: {
          attempted_at?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          platform?: Database["public"]["Enums"]["social_platform"]
          post_id?: string
          remote_post_id?: string | null
          remote_url?: string | null
          social_account_id?: string
          status?: Database["public"]["Enums"]["target_status"]
        }
        Relationships: [
          {
            foreignKeyName: "post_targets_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_targets_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          ai_generated: boolean
          content: string
          created_at: string
          id: string
          media_type: string | null
          media_urls: string[]
          original_content: string | null
          published_at: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["post_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_generated?: boolean
          content?: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_urls?: string[]
          original_content?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_generated?: boolean
          content?: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_urls?: string[]
          original_content?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      social_accounts: {
        Row: {
          access_token: string | null
          created_at: string
          handle: string
          id: string
          is_active: boolean
          meta: Json
          platform: Database["public"]["Enums"]["social_platform"]
          refresh_token: string | null
          remote_id: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          handle: string
          id?: string
          is_active?: boolean
          meta?: Json
          platform: Database["public"]["Enums"]["social_platform"]
          refresh_token?: string | null
          remote_id?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          handle?: string
          id?: string
          is_active?: boolean
          meta?: Json
          platform?: Database["public"]["Enums"]["social_platform"]
          refresh_token?: string | null
          remote_id?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          id: string
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          settings?: Json
          updated_at?: string
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
    }
    Enums: {
      app_role: "admin" | "user"
      audit_severity: "info" | "success" | "warning" | "destructive" | "muted"
      post_status:
        | "draft"
        | "scheduled"
        | "publishing"
        | "published"
        | "failed"
        | "partial"
      social_platform:
        | "facebook"
        | "instagram"
        | "linkedin"
        | "tiktok"
        | "whatsapp"
        | "telegram"
      target_status:
        | "pending"
        | "publishing"
        | "published"
        | "failed"
        | "skipped"
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
      app_role: ["admin", "user"],
      audit_severity: ["info", "success", "warning", "destructive", "muted"],
      post_status: [
        "draft",
        "scheduled",
        "publishing",
        "published",
        "failed",
        "partial",
      ],
      social_platform: [
        "facebook",
        "instagram",
        "linkedin",
        "tiktok",
        "whatsapp",
        "telegram",
      ],
      target_status: [
        "pending",
        "publishing",
        "published",
        "failed",
        "skipped",
      ],
    },
  },
} as const
