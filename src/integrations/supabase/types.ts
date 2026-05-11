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
      cards: {
        Row: {
          card_number: string
          created_at: string
          draw_id: string
          id: string
          numbers: number[]
          player_name: string
          price: number
        }
        Insert: {
          card_number: string
          created_at?: string
          draw_id: string
          id?: string
          numbers: number[]
          player_name: string
          price: number
        }
        Update: {
          card_number?: string
          created_at?: string
          draw_id?: string
          id?: string
          numbers?: number[]
          player_name?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "cards_draw_id_fkey"
            columns: ["draw_id"]
            isOneToOne: false
            referencedRelation: "draws"
            referencedColumns: ["id"]
          },
        ]
      }
      draw_numbers: {
        Row: {
          batch_id: string | null
          draw_id: string
          drawn_at: string
          id: string
          number: number
          position: number
        }
        Insert: {
          batch_id?: string | null
          draw_id: string
          drawn_at?: string
          id?: string
          number: number
          position: number
        }
        Update: {
          batch_id?: string | null
          draw_id?: string
          drawn_at?: string
          id?: string
          number?: number
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "draw_numbers_draw_id_fkey"
            columns: ["draw_id"]
            isOneToOne: false
            referencedRelation: "draws"
            referencedColumns: ["id"]
          },
        ]
      }
      draws: {
        Row: {
          card_price: number
          created_at: string
          created_by: string | null
          finalized_at: string | null
          id: string
          prize_amount: number
          scheduled_at: string
          status: Database["public"]["Enums"]["draw_status"]
        }
        Insert: {
          card_price: number
          created_at?: string
          created_by?: string | null
          finalized_at?: string | null
          id?: string
          prize_amount: number
          scheduled_at: string
          status?: Database["public"]["Enums"]["draw_status"]
        }
        Update: {
          card_price?: number
          created_at?: string
          created_by?: string | null
          finalized_at?: string | null
          id?: string
          prize_amount?: number
          scheduled_at?: string
          status?: Database["public"]["Enums"]["draw_status"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          cpf: string
          created_at: string
          id: string
          name: string | null
        }
        Insert: {
          cpf: string
          created_at?: string
          id: string
          name?: string | null
        }
        Update: {
          cpf?: string
          created_at?: string
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          card_price: number
          commission: number
          id: boolean
          prize_amount: number
          updated_at: string
        }
        Insert: {
          card_price?: number
          commission?: number
          id?: boolean
          prize_amount?: number
          updated_at?: string
        }
        Update: {
          card_price?: number
          commission?: number
          id?: boolean
          prize_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      winners: {
        Row: {
          card_id: string
          draw_id: string
          hits: number
          id: string
          prize_share: number
          won_at: string
        }
        Insert: {
          card_id: string
          draw_id: string
          hits: number
          id?: string
          prize_share: number
          won_at?: string
        }
        Update: {
          card_id?: string
          draw_id?: string
          hits?: number
          id?: string
          prize_share?: number
          won_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "winners_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "card_hits"
            referencedColumns: ["card_id"]
          },
          {
            foreignKeyName: "winners_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "winners_draw_id_fkey"
            columns: ["draw_id"]
            isOneToOne: false
            referencedRelation: "draws"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      card_hits: {
        Row: {
          card_id: string | null
          card_number: string | null
          draw_id: string | null
          hits: number | null
          numbers: number[] | null
          player_name: string | null
        }
        Insert: {
          card_id?: string | null
          card_number?: string | null
          draw_id?: string | null
          hits?: never
          numbers?: number[] | null
          player_name?: string | null
        }
        Update: {
          card_id?: string | null
          card_number?: string | null
          draw_id?: string | null
          hits?: never
          numbers?: number[] | null
          player_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_draw_id_fkey"
            columns: ["draw_id"]
            isOneToOne: false
            referencedRelation: "draws"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_draw_number: {
        Args: { p_draw: string; p_number: number }
        Returns: undefined
      }
      add_draw_numbers_batch: {
        Args: { p_draw: string; p_numbers: number[]; p_drawn_at?: string }
        Returns: undefined
      }
      delete_draw_round: {
        Args: { p_draw: string; p_batch_id: string }
        Returns: undefined
      }
      update_draw_round: {
        Args: { p_draw: string; p_batch_id: string; p_numbers: number[]; p_drawn_at: string }
        Returns: undefined
      }
    }
    Enums: {
      draw_status: "active" | "finalized" | "cancelled"
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
      draw_status: ["active", "finalized", "cancelled"],
    },
  },
} as const
