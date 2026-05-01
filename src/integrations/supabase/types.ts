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
      admin_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          related_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          related_id?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          related_id?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string | null
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          sender_id?: string
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
      pet_friendly_places: {
        Row: {
          accepts_cats: boolean
          accepts_dogs: boolean
          accepts_other_pets: boolean
          address: string | null
          air_conditioning: boolean
          brand: string | null
          caravans: boolean
          category: string
          checkin: string | null
          checkout: string | null
          city: string | null
          country: string | null
          created_at: string
          delivery: boolean
          department: string | null
          description: string | null
          dogs_indoor_allowed: boolean
          dogs_on_leash_only: boolean
          electric_hookup: boolean
          email: string | null
          facebook: string | null
          google_maps_url: string | null
          google_photo_url: string | null
          google_place_id: string | null
          google_rating: number | null
          google_review_count: number | null
          housenumber: string | null
          id: string
          instagram: string | null
          is_flagged: boolean | null
          last_updated: string | null
          latitude: number
          location: unknown
          longitude: number
          max_pet_weight_kg: number | null
          name: string
          name_fr: string | null
          note: string | null
          opening_hours: string | null
          opening_hours_covid: string | null
          operator: string | null
          outdoor_seating: boolean
          parking: string | null
          payment_card: boolean
          payment_contactless: boolean
          pet_area: boolean
          pet_fee: boolean
          pet_fee_amount: number | null
          pet_menu: boolean
          phone: string | null
          phone2: string | null
          photo_url: string | null
          postcode: string | null
          price_level: string | null
          price_range: string | null
          rating: number | null
          region: string | null
          report_count: number | null
          rooms: number | null
          source: string | null
          source_id: string | null
          stars: string | null
          state: string | null
          street: string | null
          subcategory: string | null
          tags: string | null
          takeaway: boolean
          tents: boolean
          updated_at: string
          verified: boolean
          water_bowl_provided: boolean
          website: string | null
          wheelchair: string | null
          wifi: boolean
        }
        Insert: {
          accepts_cats?: boolean
          accepts_dogs?: boolean
          accepts_other_pets?: boolean
          address?: string | null
          air_conditioning?: boolean
          brand?: string | null
          caravans?: boolean
          category?: string
          checkin?: string | null
          checkout?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          delivery?: boolean
          department?: string | null
          description?: string | null
          dogs_indoor_allowed?: boolean
          dogs_on_leash_only?: boolean
          electric_hookup?: boolean
          email?: string | null
          facebook?: string | null
          google_maps_url?: string | null
          google_photo_url?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          google_review_count?: number | null
          housenumber?: string | null
          id?: string
          instagram?: string | null
          is_flagged?: boolean | null
          last_updated?: string | null
          latitude: number
          location?: unknown
          longitude: number
          max_pet_weight_kg?: number | null
          name: string
          name_fr?: string | null
          note?: string | null
          opening_hours?: string | null
          opening_hours_covid?: string | null
          operator?: string | null
          outdoor_seating?: boolean
          parking?: string | null
          payment_card?: boolean
          payment_contactless?: boolean
          pet_area?: boolean
          pet_fee?: boolean
          pet_fee_amount?: number | null
          pet_menu?: boolean
          phone?: string | null
          phone2?: string | null
          photo_url?: string | null
          postcode?: string | null
          price_level?: string | null
          price_range?: string | null
          rating?: number | null
          region?: string | null
          report_count?: number | null
          rooms?: number | null
          source?: string | null
          source_id?: string | null
          stars?: string | null
          state?: string | null
          street?: string | null
          subcategory?: string | null
          tags?: string | null
          takeaway?: boolean
          tents?: boolean
          updated_at?: string
          verified?: boolean
          water_bowl_provided?: boolean
          website?: string | null
          wheelchair?: string | null
          wifi?: boolean
        }
        Update: {
          accepts_cats?: boolean
          accepts_dogs?: boolean
          accepts_other_pets?: boolean
          address?: string | null
          air_conditioning?: boolean
          brand?: string | null
          caravans?: boolean
          category?: string
          checkin?: string | null
          checkout?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          delivery?: boolean
          department?: string | null
          description?: string | null
          dogs_indoor_allowed?: boolean
          dogs_on_leash_only?: boolean
          electric_hookup?: boolean
          email?: string | null
          facebook?: string | null
          google_maps_url?: string | null
          google_photo_url?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          google_review_count?: number | null
          housenumber?: string | null
          id?: string
          instagram?: string | null
          is_flagged?: boolean | null
          last_updated?: string | null
          latitude?: number
          location?: unknown
          longitude?: number
          max_pet_weight_kg?: number | null
          name?: string
          name_fr?: string | null
          note?: string | null
          opening_hours?: string | null
          opening_hours_covid?: string | null
          operator?: string | null
          outdoor_seating?: boolean
          parking?: string | null
          payment_card?: boolean
          payment_contactless?: boolean
          pet_area?: boolean
          pet_fee?: boolean
          pet_fee_amount?: number | null
          pet_menu?: boolean
          phone?: string | null
          phone2?: string | null
          photo_url?: string | null
          postcode?: string | null
          price_level?: string | null
          price_range?: string | null
          rating?: number | null
          region?: string | null
          report_count?: number | null
          rooms?: number | null
          source?: string | null
          source_id?: string | null
          stars?: string | null
          state?: string | null
          street?: string | null
          subcategory?: string | null
          tags?: string | null
          takeaway?: boolean
          tents?: boolean
          updated_at?: string
          verified?: boolean
          water_bowl_provided?: boolean
          website?: string | null
          wheelchair?: string | null
          wifi?: boolean
        }
        Relationships: []
      }
      pet_photos: {
        Row: {
          caption: string | null
          created_at: string | null
          id: string
          pet_id: string
          url: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          id?: string
          pet_id: string
          url: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          id?: string
          pet_id?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_photos_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pets: {
        Row: {
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          breed: string | null
          color: string | null
          created_at: string | null
          id: string
          is_microchipped: boolean | null
          is_sterilized: boolean | null
          is_vaccinated: boolean | null
          name: string
          personality_tags: string[] | null
          sex: string | null
          size_class: string | null
          species: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          breed?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          is_microchipped?: boolean | null
          is_sterilized?: boolean | null
          is_vaccinated?: boolean | null
          name: string
          personality_tags?: string[] | null
          sex?: string | null
          size_class?: string | null
          species?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          breed?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          is_microchipped?: boolean | null
          is_sterilized?: boolean | null
          is_vaccinated?: boolean | null
          name?: string
          personality_tags?: string[] | null
          sex?: string | null
          size_class?: string | null
          species?: string
          user_id?: string
        }
        Relationships: []
      }
      place_reports: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          place_id: string | null
          reason: string
          reported_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          place_id?: string | null
          reason: string
          reported_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          place_id?: string | null
          reason?: string
          reported_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "place_reports_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "pet_friendly_places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_reports_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      place_reviews: {
        Row: {
          body: string | null
          created_at: string | null
          has_been_edited: boolean | null
          helpful_count: number | null
          id: string
          is_hidden: boolean | null
          is_reported: boolean | null
          photo_url: string | null
          place_id: string
          rating: number
          updated_at: string | null
          user_id: string
          visited_with_pet: boolean | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          has_been_edited?: boolean | null
          helpful_count?: number | null
          id?: string
          is_hidden?: boolean | null
          is_reported?: boolean | null
          photo_url?: string | null
          place_id: string
          rating: number
          updated_at?: string | null
          user_id: string
          visited_with_pet?: boolean | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          has_been_edited?: boolean | null
          helpful_count?: number | null
          id?: string
          is_hidden?: boolean | null
          is_reported?: boolean | null
          photo_url?: string | null
          place_id?: string
          rating?: number
          updated_at?: string | null
          user_id?: string
          visited_with_pet?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "place_reviews_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "pet_friendly_places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      place_submissions: {
        Row: {
          accepts_cats: boolean | null
          accepts_dogs: boolean | null
          address: string | null
          admin_note: string | null
          category: string
          city: string | null
          country: string | null
          created_at: string | null
          description: string | null
          dogs_on_leash_only: boolean | null
          id: string
          latitude: number
          longitude: number
          name: string
          opening_hours: string | null
          outdoor_seating: boolean | null
          phone: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          subcategory: string | null
          submitted_by: string | null
          water_bowl_provided: boolean | null
          website: string | null
        }
        Insert: {
          accepts_cats?: boolean | null
          accepts_dogs?: boolean | null
          address?: string | null
          admin_note?: string | null
          category: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          dogs_on_leash_only?: boolean | null
          id?: string
          latitude: number
          longitude: number
          name: string
          opening_hours?: string | null
          outdoor_seating?: boolean | null
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          subcategory?: string | null
          submitted_by?: string | null
          water_bowl_provided?: boolean | null
          website?: string | null
        }
        Update: {
          accepts_cats?: boolean | null
          accepts_dogs?: boolean | null
          address?: string | null
          admin_note?: string | null
          category?: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          dogs_on_leash_only?: boolean | null
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          opening_hours?: string | null
          outdoor_seating?: boolean | null
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          subcategory?: string | null
          submitted_by?: string | null
          water_bowl_provided?: boolean | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "place_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          is_admin: boolean
          is_banned: boolean
          last_seen_at: string | null
          points: number
          postal_code: string | null
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          is_admin?: boolean
          is_banned?: boolean
          last_seen_at?: string | null
          points?: number
          postal_code?: string | null
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_admin?: boolean
          is_banned?: boolean
          last_seen_at?: string | null
          points?: number
          postal_code?: string | null
        }
        Relationships: []
      }
      review_pets: {
        Row: {
          pet_id: string
          review_id: string
        }
        Insert: {
          pet_id: string
          review_id: string
        }
        Update: {
          pet_id?: string
          review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_pets_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_pets_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "place_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      stray_reports: {
        Row: {
          address: string | null
          behavior: string | null
          breed: string | null
          city: string | null
          color: string | null
          condition: string | null
          created_at: string | null
          description: string | null
          id: string
          lat: number
          lng: number
          photo_url: string | null
          species: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          behavior?: string | null
          breed?: string | null
          city?: string | null
          color?: string | null
          condition?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          lat: number
          lng: number
          photo_url?: string | null
          species?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          behavior?: string | null
          breed?: string | null
          city?: string | null
          color?: string | null
          condition?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          lat?: number
          lng?: number
          photo_url?: string | null
          species?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      submission_photos: {
        Row: {
          created_at: string | null
          id: string
          storage_path: string
          submission_id: string | null
          uploaded_by: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          storage_path: string
          submission_id?: string | null
          uploaded_by?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          storage_path?: string
          submission_id?: string | null
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_photos_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "place_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          related_id: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          related_id?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      admin_place_stats: {
        Args: never
        Returns: {
          category: string
          total: number
        }[]
      }
      get_nearby_pet_places: {
        Args: {
          cat_filter?: string
          dogs_only?: boolean
          radius_km?: number
          user_lat: number
          user_lon: number
        }
        Returns: {
          accepts_cats: boolean
          accepts_dogs: boolean
          address: string
          category: string
          city: string
          country: string
          description: string
          distance_km: number
          dogs_on_leash_only: boolean
          id: string
          latitude: number
          longitude: number
          name: string
          opening_hours: string
          outdoor_seating: boolean
          phone: string
          photo_url: string
          rating: number
          subcategory: string
          verified: boolean
          website: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      notify_nearby_users_new_place: {
        Args: { p_place_id: string }
        Returns: undefined
      }
      notify_nearby_users_stray: {
        Args: { p_stray_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
