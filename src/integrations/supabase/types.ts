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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
