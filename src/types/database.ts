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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      courses: {
        Row: {
          cefr_range: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          free_lessons: number | null
          id: string
          is_published: boolean | null
          language_id: string | null
          level: string | null
          name: string
          price_cents: number | null
          sort_order: number | null
          total_lessons: number | null
          updated_at: string | null
          updated_by: string | null
          word_count: number | null
        }
        Insert: {
          cefr_range?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          free_lessons?: number | null
          id?: string
          is_published?: boolean | null
          language_id?: string | null
          level?: string | null
          name: string
          price_cents?: number | null
          sort_order?: number | null
          total_lessons?: number | null
          updated_at?: string | null
          updated_by?: string | null
          word_count?: number | null
        }
        Update: {
          cefr_range?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          free_lessons?: number | null
          id?: string
          is_published?: boolean | null
          language_id?: string | null
          level?: string | null
          name?: string
          price_cents?: number | null
          sort_order?: number | null
          total_lessons?: number | null
          updated_at?: string | null
          updated_by?: string | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_language_id_fkey"
            columns: ["language_id"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
        ]
      }
      example_sentences: {
        Row: {
          created_at: string | null
          created_by: string | null
          english_sentence: string
          foreign_sentence: string
          id: string
          sort_order: number | null
          thumbnail_image_url: string | null
          updated_by: string | null
          word_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          english_sentence: string
          foreign_sentence: string
          id?: string
          sort_order?: number | null
          thumbnail_image_url?: string | null
          updated_by?: string | null
          word_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          english_sentence?: string
          foreign_sentence?: string
          id?: string
          sort_order?: number | null
          thumbnail_image_url?: string | null
          updated_by?: string | null
          word_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "example_sentences_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
        ]
      }
      languages: {
        Row: {
          code: string
          created_at: string | null
          id: string
          name: string
          native_name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          name: string
          native_name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          name?: string
          native_name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      lessons: {
        Row: {
          course_id: string | null
          created_at: string | null
          created_by: string | null
          emoji: string | null
          id: string
          is_published: boolean | null
          number: number
          sort_order: number | null
          title: string
          updated_at: string | null
          updated_by: string | null
          word_count: number | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          created_by?: string | null
          emoji?: string | null
          id?: string
          is_published?: boolean | null
          number: number
          sort_order?: number | null
          title: string
          updated_at?: string | null
          updated_by?: string | null
          word_count?: number | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          created_by?: string | null
          emoji?: string | null
          id?: string
          is_published?: boolean | null
          number?: number
          sort_order?: number | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          duration_seconds: number | null
          ended_at: string | null
          id: string
          lesson_id: string | null
          session_type: string
          started_at: string | null
          user_id: string | null
          words_mastered: number | null
          words_studied: number | null
        }
        Insert: {
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          lesson_id?: string | null
          session_type: string
          started_at?: string | null
          user_id?: string | null
          words_mastered?: number | null
          words_studied?: number | null
        }
        Update: {
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          lesson_id?: string | null
          session_type?: string
          started_at?: string | null
          user_id?: string | null
          words_mastered?: number | null
          words_studied?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      test_questions: {
        Row: {
          answered_at: string | null
          clue_level: number | null
          correct_answer: string
          id: string
          max_points: number | null
          mistake_count: number | null
          points_earned: number | null
          test_score_id: string | null
          time_to_answer_ms: number | null
          user_answer: string | null
          word_id: string | null
        }
        Insert: {
          answered_at?: string | null
          clue_level?: number | null
          correct_answer: string
          id?: string
          max_points?: number | null
          mistake_count?: number | null
          points_earned?: number | null
          test_score_id?: string | null
          time_to_answer_ms?: number | null
          user_answer?: string | null
          word_id?: string | null
        }
        Update: {
          answered_at?: string | null
          clue_level?: number | null
          correct_answer?: string
          id?: string
          max_points?: number | null
          mistake_count?: number | null
          points_earned?: number | null
          test_score_id?: string | null
          time_to_answer_ms?: number | null
          user_answer?: string | null
          word_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_questions_test_score_id_fkey"
            columns: ["test_score_id"]
            isOneToOne: false
            referencedRelation: "user_test_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_questions_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
        ]
      }
      user_languages: {
        Row: {
          added_at: string | null
          id: string
          is_current: boolean | null
          language_id: string | null
          user_id: string | null
        }
        Insert: {
          added_at?: string | null
          id?: string
          is_current?: boolean | null
          language_id?: string | null
          user_id?: string | null
        }
        Update: {
          added_at?: string | null
          id?: string
          is_current?: boolean | null
          language_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_languages_language_id_fkey"
            columns: ["language_id"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_languages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_lesson_progress: {
        Row: {
          completion_percent: number | null
          created_at: string | null
          id: string
          last_studied_at: string | null
          lesson_id: string | null
          status: string | null
          total_study_time_seconds: number | null
          updated_at: string | null
          user_id: string | null
          words_mastered: number | null
        }
        Insert: {
          completion_percent?: number | null
          created_at?: string | null
          id?: string
          last_studied_at?: string | null
          lesson_id?: string | null
          status?: string | null
          total_study_time_seconds?: number | null
          updated_at?: string | null
          user_id?: string | null
          words_mastered?: number | null
        }
        Update: {
          completion_percent?: number | null
          created_at?: string | null
          id?: string
          last_studied_at?: string | null
          lesson_id?: string | null
          status?: string | null
          total_study_time_seconds?: number | null
          updated_at?: string | null
          user_id?: string | null
          words_mastered?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_lesson_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_test_scores: {
        Row: {
          correct_answers: number
          duration_seconds: number | null
          id: string
          lesson_id: string | null
          mastered_words_count: number | null
          max_points: number
          milestone: string | null
          new_words_count: number | null
          points_earned: number
          score_percent: number
          taken_at: string | null
          total_questions: number
          user_id: string | null
        }
        Insert: {
          correct_answers: number
          duration_seconds?: number | null
          id?: string
          lesson_id?: string | null
          mastered_words_count?: number | null
          max_points?: number
          milestone?: string | null
          new_words_count?: number | null
          points_earned?: number
          score_percent?: number
          taken_at?: string | null
          total_questions: number
          user_id?: string | null
        }
        Update: {
          correct_answers?: number
          duration_seconds?: number | null
          id?: string
          lesson_id?: string | null
          mastered_words_count?: number | null
          max_points?: number
          milestone?: string | null
          new_words_count?: number | null
          points_earned?: number
          score_percent?: number
          taken_at?: string | null
          total_questions?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_test_scores_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_test_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_word_progress: {
        Row: {
          best_clue_level: number | null
          correct_streak: number | null
          created_at: string | null
          id: string
          last_mistake_count: number | null
          last_studied_at: string | null
          mastered_at: string | null
          next_review_at: string | null
          status: string | null
          times_tested: number | null
          total_points_earned: number | null
          updated_at: string | null
          user_id: string | null
          user_notes: string | null
          word_id: string | null
        }
        Insert: {
          best_clue_level?: number | null
          correct_streak?: number | null
          created_at?: string | null
          id?: string
          last_mistake_count?: number | null
          last_studied_at?: string | null
          mastered_at?: string | null
          next_review_at?: string | null
          status?: string | null
          times_tested?: number | null
          total_points_earned?: number | null
          updated_at?: string | null
          user_id?: string | null
          user_notes?: string | null
          word_id?: string | null
        }
        Update: {
          best_clue_level?: number | null
          correct_streak?: number | null
          created_at?: string | null
          id?: string
          last_mistake_count?: number | null
          last_studied_at?: string | null
          mastered_at?: string | null
          next_review_at?: string | null
          status?: string | null
          times_tested?: number | null
          total_points_earned?: number | null
          updated_at?: string | null
          user_id?: string | null
          user_notes?: string | null
          word_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_word_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_word_progress_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          current_language_id: string | null
          email: string
          hometown: string | null
          id: string
          location: string | null
          name: string | null
          nationalities: string[] | null
          total_vocabulary_count: number | null
          two_factor_enabled: boolean | null
          updated_at: string | null
          username: string | null
          website: string | null
          words_per_day: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          current_language_id?: string | null
          email: string
          hometown?: string | null
          id: string
          location?: string | null
          name?: string | null
          nationalities?: string[] | null
          total_vocabulary_count?: number | null
          two_factor_enabled?: boolean | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
          words_per_day?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          current_language_id?: string | null
          email?: string
          hometown?: string | null
          id?: string
          location?: string | null
          name?: string | null
          nationalities?: string[] | null
          total_vocabulary_count?: number | null
          two_factor_enabled?: boolean | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
          words_per_day?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "users_current_language_id_fkey"
            columns: ["current_language_id"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
        ]
      }
      words: {
        Row: {
          audio_url_english: string | null
          audio_url_foreign: string | null
          audio_url_trigger: string | null
          created_at: string | null
          created_by: string | null
          headword: string
          id: string
          language_id: string
          lemma: string
          memory_trigger_image_url: string | null
          memory_trigger_text: string | null
          notes: string | null
          part_of_speech: string | null
          gender: string | null
          transitivity: string | null
          is_irregular: boolean | null
          is_plural_only: boolean | null
          related_word_ids: string[] | null
          english: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          audio_url_english?: string | null
          audio_url_foreign?: string | null
          audio_url_trigger?: string | null
          created_at?: string | null
          created_by?: string | null
          headword: string
          id?: string
          language_id: string
          lemma: string
          memory_trigger_image_url?: string | null
          memory_trigger_text?: string | null
          notes?: string | null
          part_of_speech?: string | null
          gender?: string | null
          transitivity?: string | null
          is_irregular?: boolean | null
          is_plural_only?: boolean | null
          related_word_ids?: string[] | null
          english: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          audio_url_english?: string | null
          audio_url_foreign?: string | null
          audio_url_trigger?: string | null
          created_at?: string | null
          created_by?: string | null
          headword?: string
          id?: string
          language_id?: string
          lemma?: string
          memory_trigger_image_url?: string | null
          memory_trigger_text?: string | null
          notes?: string | null
          part_of_speech?: string | null
          gender?: string | null
          transitivity?: string | null
          is_irregular?: boolean | null
          is_plural_only?: boolean | null
          related_word_ids?: string[] | null
          english?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "words_language_id_fkey"
            columns: ["language_id"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_words: {
        Row: {
          lesson_id: string
          word_id: string
          sort_order: number
          created_at: string | null
        }
        Insert: {
          lesson_id: string
          word_id: string
          sort_order?: number
          created_at?: string | null
        }
        Update: {
          lesson_id?: string
          word_id?: string
          sort_order?: number
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_words_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_words_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
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

// ============================================================================
// CONVENIENCE TYPE ALIASES
// These provide backward compatibility with existing code
// ============================================================================

export type Language = Database["public"]["Tables"]["languages"]["Row"];
export type Course = Database["public"]["Tables"]["courses"]["Row"];
export type Lesson = Database["public"]["Tables"]["lessons"]["Row"];
export type Word = Database["public"]["Tables"]["words"]["Row"];
export type LessonWord = Database["public"]["Tables"]["lesson_words"]["Row"];
export type ExampleSentence = Database["public"]["Tables"]["example_sentences"]["Row"];
export type User = Database["public"]["Tables"]["users"]["Row"];
export type UserLanguage = Database["public"]["Tables"]["user_languages"]["Row"];
export type UserWordProgress = Database["public"]["Tables"]["user_word_progress"]["Row"];
export type UserLessonProgress = Database["public"]["Tables"]["user_lesson_progress"]["Row"];
export type StudySession = Database["public"]["Tables"]["study_sessions"]["Row"];
export type UserTestScore = Database["public"]["Tables"]["user_test_scores"]["Row"];
export type TestQuestion = Database["public"]["Tables"]["test_questions"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];

// Insert types
export type LanguageInsert = Database["public"]["Tables"]["languages"]["Insert"];
export type CourseInsert = Database["public"]["Tables"]["courses"]["Insert"];
export type LessonInsert = Database["public"]["Tables"]["lessons"]["Insert"];
export type WordInsert = Database["public"]["Tables"]["words"]["Insert"];
export type LessonWordInsert = Database["public"]["Tables"]["lesson_words"]["Insert"];
export type UserWordProgressInsert = Database["public"]["Tables"]["user_word_progress"]["Insert"];
export type UserTestScoreInsert = Database["public"]["Tables"]["user_test_scores"]["Insert"];
export type TestQuestionInsert = Database["public"]["Tables"]["test_questions"]["Insert"];

// Update types
export type UserUpdate = Database["public"]["Tables"]["users"]["Update"];
export type UserWordProgressUpdate = Database["public"]["Tables"]["user_word_progress"]["Update"];
export type UserLessonProgressUpdate = Database["public"]["Tables"]["user_lesson_progress"]["Update"];
