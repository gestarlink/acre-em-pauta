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
      ads: {
        Row: {
          active: boolean
          advertiser_id: string | null
          created_at: string
          end_at: string | null
          id: string
          image_url: string | null
          image_url_mobile: string | null
          link_url: string | null
          name: string
          placement: string
          start_at: string | null
        }
        Insert: {
          active?: boolean
          advertiser_id?: string | null
          created_at?: string
          end_at?: string | null
          id?: string
          image_url?: string | null
          image_url_mobile?: string | null
          link_url?: string | null
          name: string
          placement: string
          start_at?: string | null
        }
        Update: {
          active?: boolean
          advertiser_id?: string | null
          created_at?: string
          end_at?: string | null
          id?: string
          image_url?: string | null
          image_url_mobile?: string | null
          link_url?: string | null
          name?: string
          placement?: string
          start_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ads_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertisers"
            referencedColumns: ["id"]
          },
        ]
      }
      advertisers: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      ai_analysis: {
        Row: {
          created_at: string
          engagement_potential: number | null
          fake_news_risk: number | null
          id: string
          local_relevance: number | null
          public_importance: number | null
          queue_item_id: string | null
          raw_response: Json | null
          reasoning: string | null
          sensationalism: number | null
          social_potential: boolean | null
          suggested_category: string | null
          urgency: number | null
        }
        Insert: {
          created_at?: string
          engagement_potential?: number | null
          fake_news_risk?: number | null
          id?: string
          local_relevance?: number | null
          public_importance?: number | null
          queue_item_id?: string | null
          raw_response?: Json | null
          reasoning?: string | null
          sensationalism?: number | null
          social_potential?: boolean | null
          suggested_category?: string | null
          urgency?: number | null
        }
        Update: {
          created_at?: string
          engagement_potential?: number | null
          fake_news_risk?: number | null
          id?: string
          local_relevance?: number | null
          public_importance?: number | null
          queue_item_id?: string | null
          raw_response?: Json | null
          reasoning?: string | null
          sensationalism?: number | null
          social_potential?: boolean | null
          suggested_category?: string | null
          urgency?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_analysis_queue_item_id_fkey"
            columns: ["queue_item_id"]
            isOneToOne: false
            referencedRelation: "ai_news_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_news_queue: {
        Row: {
          created_at: string
          fetched_at: string
          id: string
          original_image_url: string | null
          original_summary: string | null
          original_title: string
          original_url: string | null
          relevance: Database["public"]["Enums"]["ai_relevance"] | null
          relevance_score: number | null
          source_id: string | null
          source_name: string | null
          status: Database["public"]["Enums"]["queue_status"]
          suggested_category_id: string | null
          urgency_score: number | null
        }
        Insert: {
          created_at?: string
          fetched_at?: string
          id?: string
          original_image_url?: string | null
          original_summary?: string | null
          original_title: string
          original_url?: string | null
          relevance?: Database["public"]["Enums"]["ai_relevance"] | null
          relevance_score?: number | null
          source_id?: string | null
          source_name?: string | null
          status?: Database["public"]["Enums"]["queue_status"]
          suggested_category_id?: string | null
          urgency_score?: number | null
        }
        Update: {
          created_at?: string
          fetched_at?: string
          id?: string
          original_image_url?: string | null
          original_summary?: string | null
          original_title?: string
          original_url?: string | null
          relevance?: Database["public"]["Enums"]["ai_relevance"] | null
          relevance_score?: number | null
          source_id?: string | null
          source_name?: string | null
          status?: Database["public"]["Enums"]["queue_status"]
          suggested_category_id?: string | null
          urgency_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_news_queue_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_news_queue_suggested_category_id_fkey"
            columns: ["suggested_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          name: string
          slug: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name: string
          slug: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      generated_rewrites: {
        Row: {
          body: string | null
          card_headline: string | null
          created_at: string
          excerpt: string | null
          id: string
          instagram_caption: string | null
          meta_description: string | null
          meta_title: string | null
          queue_item_id: string | null
          raw_response: Json | null
          slug: string | null
          subtitle: string | null
          tags: string[] | null
          telegram_text: string | null
          title: string | null
          whatsapp_text: string | null
        }
        Insert: {
          body?: string | null
          card_headline?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          instagram_caption?: string | null
          meta_description?: string | null
          meta_title?: string | null
          queue_item_id?: string | null
          raw_response?: Json | null
          slug?: string | null
          subtitle?: string | null
          tags?: string[] | null
          telegram_text?: string | null
          title?: string | null
          whatsapp_text?: string | null
        }
        Update: {
          body?: string | null
          card_headline?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          instagram_caption?: string | null
          meta_description?: string | null
          meta_title?: string | null
          queue_item_id?: string | null
          raw_response?: Json | null
          slug?: string | null
          subtitle?: string | null
          tags?: string[] | null
          telegram_text?: string | null
          title?: string | null
          whatsapp_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_rewrites_queue_item_id_fkey"
            columns: ["queue_item_id"]
            isOneToOne: false
            referencedRelation: "ai_news_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_social_posts: {
        Row: {
          body_text: string | null
          caption: string | null
          created_at: string
          cta: string | null
          format: string
          headline: string | null
          id: string
          image_prompt: string | null
          image_url: string | null
          post_id: string | null
          variant: string | null
          video_url: string | null
        }
        Insert: {
          body_text?: string | null
          caption?: string | null
          created_at?: string
          cta?: string | null
          format: string
          headline?: string | null
          id?: string
          image_prompt?: string | null
          image_url?: string | null
          post_id?: string | null
          variant?: string | null
          video_url?: string | null
        }
        Update: {
          body_text?: string | null
          caption?: string | null
          created_at?: string
          cta?: string | null
          format?: string
          headline?: string | null
          id?: string
          image_prompt?: string | null
          image_url?: string | null
          post_id?: string | null
          variant?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_social_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_video_scripts: {
        Row: {
          caption: string | null
          cover_suggestion: string | null
          created_at: string
          id: string
          narration: string | null
          post_id: string | null
          scenes: Json | null
          title: string | null
        }
        Insert: {
          caption?: string | null
          cover_suggestion?: string | null
          created_at?: string
          id?: string
          narration?: string | null
          post_id?: string | null
          scenes?: Json | null
          title?: string | null
        }
        Update: {
          caption?: string | null
          cover_suggestion?: string | null
          created_at?: string
          id?: string
          narration?: string | null
          post_id?: string | null
          scenes?: Json | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_video_scripts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_views: {
        Row: {
          id: number
          post_id: string | null
          viewed_at: string
        }
        Insert: {
          id?: number
          post_id?: string | null
          viewed_at?: string
        }
        Update: {
          id?: number
          post_id?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string | null
          author_name: string | null
          body: string
          category_id: string | null
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_breaking: boolean
          is_featured: boolean
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          scheduled_at: string | null
          slug: string
          source_id: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["post_status"]
          subtitle: string | null
          tags: string[] | null
          title: string
          updated_at: string
          views_count: number
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          body: string
          category_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_breaking?: boolean
          is_featured?: boolean
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          slug: string
          source_id?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          subtitle?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          views_count?: number
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          body?: string
          category_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_breaking?: boolean
          is_featured?: boolean
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          slug?: string
          source_id?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          subtitle?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      sources: {
        Row: {
          active: boolean
          category_id: string | null
          created_at: string
          credibility: number
          frequency_minutes: number
          id: string
          last_fetched_at: string | null
          name: string
          notes: string | null
          source_type: Database["public"]["Enums"]["source_type"]
          url: string
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          credibility?: number
          frequency_minutes?: number
          id?: string
          last_fetched_at?: string | null
          name: string
          notes?: string | null
          source_type?: Database["public"]["Enums"]["source_type"]
          url: string
        }
        Update: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          credibility?: number
          frequency_minutes?: number
          id?: string
          last_fetched_at?: string | null
          name?: string
          notes?: string | null
          source_type?: Database["public"]["Enums"]["source_type"]
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "sources_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      submitted_tips: {
        Row: {
          allow_contact: boolean
          category_id: string | null
          city: string | null
          created_at: string
          description: string
          email: string | null
          id: string
          media_url: string | null
          name: string
          neighborhood: string | null
          status: string
          whatsapp: string | null
        }
        Insert: {
          allow_contact?: boolean
          category_id?: string | null
          city?: string | null
          created_at?: string
          description: string
          email?: string | null
          id?: string
          media_url?: string | null
          name: string
          neighborhood?: string | null
          status?: string
          whatsapp?: string | null
        }
        Update: {
          allow_contact?: boolean
          category_id?: string | null
          city?: string | null
          created_at?: string
          description?: string
          email?: string | null
          id?: string
          media_url?: string | null
          name?: string
          neighborhood?: string | null
          status?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submitted_tips_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
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
          role: Database["public"]["Enums"]["app_role"]
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
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      ai_relevance: "alta" | "media" | "baixa" | "descartavel" | "checagem"
      app_role: "admin" | "editor" | "viewer"
      post_status: "rascunho" | "em_revisao" | "agendado" | "publicado"
      queue_status:
        | "novo"
        | "analisado"
        | "aprovado"
        | "descartado"
        | "reescrito"
        | "publicado"
      source_type: "rss" | "site" | "blog" | "portal" | "oficial" | "manual"
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
      ai_relevance: ["alta", "media", "baixa", "descartavel", "checagem"],
      app_role: ["admin", "editor", "viewer"],
      post_status: ["rascunho", "em_revisao", "agendado", "publicado"],
      queue_status: [
        "novo",
        "analisado",
        "aprovado",
        "descartado",
        "reescrito",
        "publicado",
      ],
      source_type: ["rss", "site", "blog", "portal", "oficial", "manual"],
    },
  },
} as const
