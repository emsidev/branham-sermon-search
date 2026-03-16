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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      sermons: {
        Row: {
          city: string | null
          created_at: string
          date: string
          fts: unknown
          id: string
          location: string | null
          summary: string | null
          scripture: string | null
          sermon_code: string
          state: string | null
          tags: string[]
          text_content: string
          title: string
          updated_at: string
          year: number | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          date: string
          fts?: unknown
          id?: string
          location?: string | null
          summary?: string | null
          scripture?: string | null
          sermon_code: string
          state?: string | null
          tags?: string[]
          text_content?: string
          title: string
          updated_at?: string
          year?: never
        }
        Update: {
          city?: string | null
          created_at?: string
          date?: string
          fts?: unknown
          id?: string
          location?: string | null
          summary?: string | null
          scripture?: string | null
          sermon_code?: string
          state?: string | null
          tags?: string[]
          text_content?: string
          title?: string
          updated_at?: string
          year?: never
        }
        Relationships: []
      }
      sermon_audio: {
        Row: {
          audio_url: string
          created_at: string
          duration_seconds: number | null
          external_id: string | null
          provider: string | null
          sermon_id: string
          updated_at: string
        }
        Insert: {
          audio_url: string
          created_at?: string
          duration_seconds?: number | null
          external_id?: string | null
          provider?: string | null
          sermon_id: string
          updated_at?: string
        }
        Update: {
          audio_url?: string
          created_at?: string
          duration_seconds?: number | null
          external_id?: string | null
          provider?: string | null
          sermon_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sermon_audio_sermon_id_fkey"
            columns: ["sermon_id"]
            isOneToOne: true
            referencedRelation: "sermons"
            referencedColumns: ["id"]
          },
        ]
      }
      sermon_documents: {
        Row: {
          created_at: string
          id: string
          imported_at: string
          metadata: Json
          page_count: number | null
          pdf_filename: string | null
          pdf_sha256: string | null
          pdf_source_path: string
          sermon_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          imported_at?: string
          metadata?: Json
          page_count?: number | null
          pdf_filename?: string | null
          pdf_sha256?: string | null
          pdf_source_path: string
          sermon_id: string
        }
        Update: {
          created_at?: string
          id?: string
          imported_at?: string
          metadata?: Json
          page_count?: number | null
          pdf_filename?: string | null
          pdf_sha256?: string | null
          pdf_source_path?: string
          sermon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sermon_documents_sermon_id_fkey"
            columns: ["sermon_id"]
            isOneToOne: true
            referencedRelation: "sermons"
            referencedColumns: ["id"]
          },
        ]
      }
      sermon_chunks: {
        Row: {
          chunk_end: number
          chunk_fts: unknown
          chunk_index: number
          chunk_start: number
          chunk_text: string
          created_at: string
          id: number
          paragraph_id: number
          paragraph_number: number
          sermon_id: string
        }
        Insert: {
          chunk_end: number
          chunk_fts?: unknown
          chunk_index: number
          chunk_start: number
          chunk_text: string
          created_at?: string
          id?: number
          paragraph_id: number
          paragraph_number: number
          sermon_id: string
        }
        Update: {
          chunk_end?: number
          chunk_fts?: unknown
          chunk_index?: number
          chunk_start?: number
          chunk_text?: string
          created_at?: string
          id?: number
          paragraph_id?: number
          paragraph_number?: number
          sermon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sermon_chunks_paragraph_id_fkey"
            columns: ["paragraph_id"]
            isOneToOne: false
            referencedRelation: "sermon_paragraphs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sermon_chunks_sermon_id_fkey"
            columns: ["sermon_id"]
            isOneToOne: false
            referencedRelation: "sermons"
            referencedColumns: ["id"]
          },
        ]
      }
      sermon_paragraphs: {
        Row: {
          created_at: string
          id: number
          paragraph_fts: unknown
          paragraph_number: number
          paragraph_text: string
          printed_paragraph_number: number | null
          sermon_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          paragraph_fts?: unknown
          paragraph_number: number
          paragraph_text: string
          printed_paragraph_number?: number | null
          sermon_id: string
        }
        Update: {
          created_at?: string
          id?: number
          paragraph_fts?: unknown
          paragraph_number?: number
          paragraph_text?: string
          printed_paragraph_number?: number | null
          sermon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sermon_paragraphs_sermon_id_fkey"
            columns: ["sermon_id"]
            isOneToOne: false
            referencedRelation: "sermons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_keyboard_shortcuts: {
        Row: {
          action: string
          created_at: string
          id: number
          key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: number
          key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: number
          key?: string
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
      search_sermon_chunks: {
        Args: {
          p_limit?: number
          p_location?: string | null
          p_match_case?: boolean
          p_match_whole_word?: boolean
          p_offset?: number
          p_query: string
          p_sort?: string | null
          p_title?: string | null
          p_year?: number | null
        }
        Returns: {
          chunk_index: number | null
          chunk_total: number | null
          date: string
          hit_id: string
          is_exact_match: boolean
          location: string | null
          match_source: string
          paragraph_number: number | null
          printed_paragraph_number: number | null
          relevance: number
          sermon_code: string
          sermon_id: string
          summary: string | null
          snippet: string
          tags: string[]
          title: string
          total_count: number
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
