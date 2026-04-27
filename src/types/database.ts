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
      activity_flags: {
        Row: {
          created_at: string | null
          details: Json | null
          flag_type: string
          id: string
          resolved: boolean | null
          session_id: string | null
          severity: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          flag_type: string
          id?: string
          resolved?: boolean | null
          session_id?: string | null
          severity?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          flag_type?: string
          id?: string
          resolved?: boolean | null
          session_id?: string | null
          severity?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_flags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
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
          legacy_ref: number | null
          level: string | null
          name: string
          price_override_cents: number | null
          sort_order: number | null
          thumbnail_url: string | null
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
          legacy_ref?: number | null
          level?: string | null
          name: string
          price_override_cents?: number | null
          sort_order?: number | null
          thumbnail_url?: string | null
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
          legacy_ref?: number | null
          level?: string | null
          name?: string
          price_override_cents?: number | null
          sort_order?: number | null
          thumbnail_url?: string | null
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
      credit_transactions: {
        Row: {
          amount_cents: number
          created_at: string | null
          description: string | null
          id: string
          reference_id: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      help_entries: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          is_published: boolean
          language_codes: string[] | null
          preview: string | null
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          id?: string
          is_published?: boolean
          language_codes?: string[] | null
          preview?: string | null
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_published?: boolean
          language_codes?: string[] | null
          preview?: string | null
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      languages: {
        Row: {
          code: string
          created_at: string | null
          greetings: Json | null
          id: string
          is_visible: boolean
          name: string
          native_name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          greetings?: Json | null
          id?: string
          is_visible?: boolean
          name: string
          native_name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          greetings?: Json | null
          id?: string
          is_visible?: boolean
          name?: string
          native_name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      leaderboard_rewards: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          league: string
          rank_max: number
          rank_min: number
          reward_cents: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          league: string
          rank_max: number
          rank_min: number
          reward_cents?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          league?: string
          rank_max?: number
          rank_min?: number
          reward_cents?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      lesson_words: {
        Row: {
          created_at: string | null
          lesson_id: string
          sort_order: number | null
          word_id: string
        }
        Insert: {
          created_at?: string | null
          lesson_id: string
          sort_order?: number | null
          word_id: string
        }
        Update: {
          created_at?: string | null
          lesson_id?: string
          sort_order?: number | null
          word_id?: string
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
      lessons: {
        Row: {
          course_id: string | null
          created_at: string | null
          created_by: string | null
          emoji: string | null
          id: string
          is_published: boolean | null
          legacy_lesson_id: number | null
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
          legacy_lesson_id?: number | null
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
          legacy_lesson_id?: number | null
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
      notification_broadcasts: {
        Row: {
          audience: Json
          channels: string[]
          created_at: string | null
          created_by: string | null
          data: Json | null
          id: string
          message: string
          recipient_count: number | null
          scheduled_for: string | null
          sent_at: string | null
          status: string
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          audience?: Json
          channels?: string[]
          created_at?: string | null
          created_by?: string | null
          data?: Json | null
          id?: string
          message: string
          recipient_count?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          audience?: Json
          channels?: string[]
          created_at?: string | null
          created_by?: string | null
          data?: Json | null
          id?: string
          message?: string
          recipient_count?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_broadcasts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          channels: string[]
          created_at: string
          default_data: Json | null
          description: string | null
          enabled: boolean
          id: string
          is_system: boolean
          key: string
          label: string
          message: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          channels?: string[]
          created_at?: string
          default_data?: Json | null
          description?: string | null
          enabled?: boolean
          id?: string
          is_system?: boolean
          key: string
          label: string
          message: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          channels?: string[]
          created_at?: string
          default_data?: Json | null
          description?: string | null
          enabled?: boolean
          id?: string
          is_system?: boolean
          key?: string
          label?: string
          message?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_type_fkey"
            columns: ["type"]
            isOneToOne: false
            referencedRelation: "notification_types"
            referencedColumns: ["type"]
          },
        ]
      }
      notification_types: {
        Row: {
          description: string | null
          enabled: boolean
          label: string
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          description?: string | null
          enabled?: boolean
          label: string
          sort_order?: number
          type: string
          updated_at?: string
        }
        Update: {
          description?: string | null
          enabled?: boolean
          label?: string
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          broadcast_id: string | null
          channel: string
          created_at: string | null
          data: Json | null
          dismissed_at: string | null
          expires_at: string | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          broadcast_id?: string | null
          channel?: string
          created_at?: string | null
          data?: Json | null
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          broadcast_id?: string | null
          channel?: string
          created_at?: string | null
          data?: Json | null
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "notification_broadcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_config: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      pricing_plans: {
        Row: {
          amount_cents: number
          billing_model: string
          created_at: string | null
          currency: string
          id: string
          is_active: boolean
          stripe_price_id: string | null
          stripe_product_id: string | null
          tier: string
          updated_at: string | null
        }
        Insert: {
          amount_cents: number
          billing_model: string
          created_at?: string | null
          currency?: string
          id?: string
          is_active?: boolean
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          tier: string
          updated_at?: string | null
        }
        Update: {
          amount_cents?: number
          billing_model?: string
          created_at?: string | null
          currency?: string
          id?: string
          is_active?: boolean
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          tier?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string | null
          credit_amount_cents: number
          credited_at: string | null
          id: string
          referral_code: string
          referred_user_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          credit_amount_cents?: number
          credited_at?: string | null
          id?: string
          referral_code: string
          referred_user_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          created_at?: string | null
          credit_amount_cents?: number
          credited_at?: string | null
          id?: string
          referral_code?: string
          referred_user_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      study_music_tracks: {
        Row: {
          author: string | null
          bpm: number | null
          category: string | null
          created_at: string
          description: string | null
          duration_seconds: number
          file_path: string
          file_size: number | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          author?: string | null
          bpm?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          duration_seconds: number
          file_path: string
          file_size?: number | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          author?: string | null
          bpm?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number
          file_path?: string
          file_size?: number | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
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
      subscriptions: {
        Row: {
          amount_cents: number
          cancel_at_period_end: boolean | null
          created_at: string | null
          currency: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          target_id: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          target_id?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          target_id?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
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
      user_daily_activity: {
        Row: {
          activity_date: string
          created_at: string | null
          id: string
          language_id: string
          sessions_count: number | null
          study_time_seconds: number | null
          test_max_points: number | null
          test_points_earned: number | null
          updated_at: string | null
          user_id: string
          words_mastered: number | null
          words_studied: number | null
        }
        Insert: {
          activity_date: string
          created_at?: string | null
          id?: string
          language_id: string
          sessions_count?: number | null
          study_time_seconds?: number | null
          test_max_points?: number | null
          test_points_earned?: number | null
          updated_at?: string | null
          user_id: string
          words_mastered?: number | null
          words_studied?: number | null
        }
        Update: {
          activity_date?: string
          created_at?: string | null
          id?: string
          language_id?: string
          sessions_count?: number | null
          study_time_seconds?: number | null
          test_max_points?: number | null
          test_points_earned?: number | null
          updated_at?: string | null
          user_id?: string
          words_mastered?: number | null
          words_studied?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_daily_activity_language_id_fkey"
            columns: ["language_id"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_daily_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
          next_milestone: string | null
          next_test_due_at: string | null
          status: string | null
          total_study_time_seconds: number | null
          updated_at: string | null
          user_id: string | null
          words_learned: number | null
          words_mastered: number | null
        }
        Insert: {
          completion_percent?: number | null
          created_at?: string | null
          id?: string
          last_studied_at?: string | null
          lesson_id?: string | null
          next_milestone?: string | null
          next_test_due_at?: string | null
          status?: string | null
          total_study_time_seconds?: number | null
          updated_at?: string | null
          user_id?: string | null
          words_learned?: number | null
          words_mastered?: number | null
        }
        Update: {
          completion_percent?: number | null
          created_at?: string | null
          id?: string
          last_studied_at?: string | null
          lesson_id?: string | null
          next_milestone?: string | null
          next_test_due_at?: string | null
          status?: string | null
          total_study_time_seconds?: number | null
          updated_at?: string | null
          user_id?: string | null
          words_learned?: number | null
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
      user_notification_preferences: {
        Row: {
          email: boolean
          in_app: boolean
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          email?: boolean
          in_app?: boolean
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          email?: boolean
          in_app?: boolean
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_preferences_user_id_fkey"
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
          is_retest: boolean
          learned_words_count: number
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
          is_retest?: boolean
          learned_words_count?: number
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
          is_retest?: boolean
          learned_words_count?: number
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
          learned_at: string | null
          learning_at: string | null
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
          learned_at?: string | null
          learning_at?: string | null
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
          learned_at?: string | null
          learning_at?: string | null
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
          cohort: string | null
          created_at: string | null
          current_course_id: string | null
          current_language_id: string | null
          current_streak: number | null
          email: string
          hometown: string | null
          id: string
          last_activity_date: string | null
          league: string | null
          league_points: number | null
          location: string | null
          longest_streak: number | null
          name: string | null
          nationalities: string[] | null
          referral_code: string | null
          stripe_customer_id: string | null
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
          cohort?: string | null
          created_at?: string | null
          current_course_id?: string | null
          current_language_id?: string | null
          current_streak?: number | null
          email: string
          hometown?: string | null
          id: string
          last_activity_date?: string | null
          league?: string | null
          league_points?: number | null
          location?: string | null
          longest_streak?: number | null
          name?: string | null
          nationalities?: string[] | null
          referral_code?: string | null
          stripe_customer_id?: string | null
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
          cohort?: string | null
          created_at?: string | null
          current_course_id?: string | null
          current_language_id?: string | null
          current_streak?: number | null
          email?: string
          hometown?: string | null
          id?: string
          last_activity_date?: string | null
          league?: string | null
          league_points?: number | null
          location?: string | null
          longest_streak?: number | null
          name?: string | null
          nationalities?: string[] | null
          referral_code?: string | null
          stripe_customer_id?: string | null
          total_vocabulary_count?: number | null
          two_factor_enabled?: boolean | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
          words_per_day?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "users_current_course_id_fkey"
            columns: ["current_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_current_language_id_fkey"
            columns: ["current_language_id"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_leaderboard_snapshots: {
        Row: {
          avg_accuracy: number | null
          avg_words_per_day: number | null
          created_at: string | null
          id: string
          language_id: string
          league: string
          league_points: number | null
          rank: number
          reward_cents: number | null
          streak_days: number | null
          user_id: string
          week_end: string
          week_start: string
          words_mastered: number | null
          words_studied: number | null
        }
        Insert: {
          avg_accuracy?: number | null
          avg_words_per_day?: number | null
          created_at?: string | null
          id?: string
          language_id: string
          league: string
          league_points?: number | null
          rank: number
          reward_cents?: number | null
          streak_days?: number | null
          user_id: string
          week_end: string
          week_start: string
          words_mastered?: number | null
          words_studied?: number | null
        }
        Update: {
          avg_accuracy?: number | null
          avg_words_per_day?: number | null
          created_at?: string | null
          id?: string
          language_id?: string
          league?: string
          league_points?: number | null
          rank?: number
          reward_cents?: number | null
          streak_days?: number | null
          user_id?: string
          week_end?: string
          week_start?: string
          words_mastered?: number | null
          words_studied?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_leaderboard_snapshots_language_id_fkey"
            columns: ["language_id"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_leaderboard_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      word_relationships: {
        Row: {
          created_at: string | null
          id: string
          related_word_id: string
          relationship_type: string
          word_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          related_word_id: string
          relationship_type: string
          word_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          related_word_id?: string
          relationship_type?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "word_relationships_related_word_id_fkey"
            columns: ["related_word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "word_relationships_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
        ]
      }
      words: {
        Row: {
          admin_notes: string | null
          alternate_answers: string[] | null
          alternate_english_answers: string[] | null
          audio_url_english: string | null
          audio_url_foreign: string | null
          audio_url_trigger: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          developer_notes: string | null
          english: string
          flashcard_image_url: string | null
          gender: string | null
          grammatical_number: string | null
          headword: string
          id: string
          information_body: string | null
          is_false_friend: boolean | null
          is_irregular: boolean | null
          is_plural_only: boolean | null
          language_id: string
          legacy_gender_code: string | null
          legacy_image_suffix: string | null
          legacy_refn: number | null
          lemma: string
          memory_trigger_image_url: string | null
          memory_trigger_text: string | null
          notes: string | null
          notes_in_memory_trigger: boolean | null
          part_of_speech: string | null
          phrase_type: string | null
          picture_bad_svg: boolean | null
          picture_missing: boolean | null
          picture_wrong: boolean | null
          picture_wrong_notes: string | null
          related_word_ids: string[] | null
          tags: string[] | null
          transitivity: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          admin_notes?: string | null
          alternate_answers?: string[] | null
          alternate_english_answers?: string[] | null
          audio_url_english?: string | null
          audio_url_foreign?: string | null
          audio_url_trigger?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          developer_notes?: string | null
          english: string
          flashcard_image_url?: string | null
          gender?: string | null
          grammatical_number?: string | null
          headword: string
          id?: string
          information_body?: string | null
          is_false_friend?: boolean | null
          is_irregular?: boolean | null
          is_plural_only?: boolean | null
          language_id: string
          legacy_gender_code?: string | null
          legacy_image_suffix?: string | null
          legacy_refn?: number | null
          lemma: string
          memory_trigger_image_url?: string | null
          memory_trigger_text?: string | null
          notes?: string | null
          notes_in_memory_trigger?: boolean | null
          part_of_speech?: string | null
          phrase_type?: string | null
          picture_bad_svg?: boolean | null
          picture_missing?: boolean | null
          picture_wrong?: boolean | null
          picture_wrong_notes?: string | null
          related_word_ids?: string[] | null
          tags?: string[] | null
          transitivity?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          admin_notes?: string | null
          alternate_answers?: string[] | null
          alternate_english_answers?: string[] | null
          audio_url_english?: string | null
          audio_url_foreign?: string | null
          audio_url_trigger?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          developer_notes?: string | null
          english?: string
          flashcard_image_url?: string | null
          gender?: string | null
          grammatical_number?: string | null
          headword?: string
          id?: string
          information_body?: string | null
          is_false_friend?: boolean | null
          is_irregular?: boolean | null
          is_plural_only?: boolean | null
          language_id?: string
          legacy_gender_code?: string | null
          legacy_image_suffix?: string | null
          legacy_refn?: number | null
          lemma?: string
          memory_trigger_image_url?: string | null
          memory_trigger_text?: string | null
          notes?: string | null
          notes_in_memory_trigger?: boolean | null
          part_of_speech?: string | null
          phrase_type?: string | null
          picture_bad_svg?: boolean | null
          picture_missing?: boolean | null
          picture_wrong?: boolean | null
          picture_wrong_notes?: string | null
          related_word_ids?: string[] | null
          tags?: string[] | null
          transitivity?: string | null
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
      tip_words: {
        Row: {
          created_at: string | null
          sort_order: number | null
          tip_id: string
          word_id: string
        }
        Insert: {
          created_at?: string | null
          sort_order?: number | null
          tip_id: string
          word_id: string
        }
        Update: {
          created_at?: string | null
          sort_order?: number | null
          tip_id?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tip_words_tip_id_fkey"
            columns: ["tip_id"]
            isOneToOne: false
            referencedRelation: "tips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tip_words_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
        ]
      }
      tips: {
        Row: {
          body: string
          created_at: string | null
          display_context: Database["public"]["Enums"]["display_context"]
          emoji: string | null
          id: string
          is_active: boolean
          sort_order: number | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          display_context?: Database["public"]["Enums"]["display_context"]
          emoji?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          display_context?: Database["public"]["Enums"]["display_context"]
          emoji?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_tip_dismissals: {
        Row: {
          dismissed_at: string | null
          tip_id: string
          user_id: string
        }
        Insert: {
          dismissed_at?: string | null
          tip_id: string
          user_id: string
        }
        Update: {
          dismissed_at?: string | null
          tip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tip_dismissals_tip_id_fkey"
            columns: ["tip_id"]
            isOneToOne: false
            referencedRelation: "tips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tip_dismissals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      f_unaccent: { Args: { "": string }; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      get_leaderboard: {
        Args: {
          p_language_id: string
          p_limit?: number
          p_metric?: string
          p_period?: string
        }
        Returns: {
          avatar_url: string
          current_streak: number
          league: string
          metric_value: number
          name: string
          nationalities: string[]
          rank: number
          user_id: string
          username: string
        }[]
      }
      get_user_leaderboard_position: {
        Args: {
          p_language_id: string
          p_metric?: string
          p_period?: string
          p_user_id: string
        }
        Returns: {
          metric_value: number
          rank: number
          total_users: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      search_language_words: {
        Args: { p_language_id: string; p_query: string }
        Returns: {
          category: string
          english: string
          headword: string
          lesson_id: string
          lesson_number: number
          lesson_title: string
          word_id: string
        }[]
      }
      search_words: {
        Args: { p_exclude_word_id?: string; p_query: string }
        Returns: {
          english: string
          headword: string
          language_id: string
          word_id: string
        }[]
      }
      update_daily_activity: {
        Args: {
          p_language_id: string
          p_study_time_seconds?: number
          p_test_max_points?: number
          p_test_points_earned?: number
          p_user_id: string
          p_words_mastered?: number
          p_words_studied?: number
        }
        Returns: undefined
      }
    }
    Enums: {
      display_context: "study_sidebar"
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
      display_context: ["study_sidebar"],
    },
  },
} as const

// ============================================================================
// CONVENIENCE TYPE ALIASES
// These provide backward compatibility with existing code
// ============================================================================

export type Language = Database["public"]["Tables"]["languages"]["Row"];

// Greetings JSONB shape stored on languages
export interface GreetingEntry {
  text: string;
  translation: string;
}
export interface LanguageGreetings {
  morning: GreetingEntry;
  afternoon: GreetingEntry;
  evening: GreetingEntry;
}
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
export type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];
export type NotificationUpdate = Database["public"]["Tables"]["notifications"]["Update"];
export type NotificationBroadcast = Database["public"]["Tables"]["notification_broadcasts"]["Row"];
export type NotificationBroadcastInsert = Database["public"]["Tables"]["notification_broadcasts"]["Insert"];
export type NotificationBroadcastUpdate = Database["public"]["Tables"]["notification_broadcasts"]["Update"];
export type NotificationTypeConfig = Database["public"]["Tables"]["notification_types"]["Row"];
export type NotificationTypeConfigInsert = Database["public"]["Tables"]["notification_types"]["Insert"];
export type NotificationTypeConfigUpdate = Database["public"]["Tables"]["notification_types"]["Update"];
export type NotificationTemplate = Database["public"]["Tables"]["notification_templates"]["Row"];
export type NotificationTemplateInsert = Database["public"]["Tables"]["notification_templates"]["Insert"];
export type NotificationTemplateUpdate = Database["public"]["Tables"]["notification_templates"]["Update"];
export type UserNotificationPreference = Database["public"]["Tables"]["user_notification_preferences"]["Row"];
export type UserNotificationPreferenceInsert = Database["public"]["Tables"]["user_notification_preferences"]["Insert"];
export type UserNotificationPreferenceUpdate = Database["public"]["Tables"]["user_notification_preferences"]["Update"];
export type StudyMusicTrack = Database["public"]["Tables"]["study_music_tracks"]["Row"];

// Insert types
export type LanguageInsert = Database["public"]["Tables"]["languages"]["Insert"];
export type CourseInsert = Database["public"]["Tables"]["courses"]["Insert"];
export type LessonInsert = Database["public"]["Tables"]["lessons"]["Insert"];
export type WordInsert = Database["public"]["Tables"]["words"]["Insert"];
export type LessonWordInsert = Database["public"]["Tables"]["lesson_words"]["Insert"];
export type UserWordProgressInsert = Database["public"]["Tables"]["user_word_progress"]["Insert"];
export type UserTestScoreInsert = Database["public"]["Tables"]["user_test_scores"]["Insert"];
export type TestQuestionInsert = Database["public"]["Tables"]["test_questions"]["Insert"];
export type StudyMusicTrackInsert = Database["public"]["Tables"]["study_music_tracks"]["Insert"];
export type StudyMusicTrackUpdate = Database["public"]["Tables"]["study_music_tracks"]["Update"];

// Update types
export type UserUpdate = Database["public"]["Tables"]["users"]["Update"];
export type UserWordProgressUpdate = Database["public"]["Tables"]["user_word_progress"]["Update"];
export type UserLessonProgressUpdate = Database["public"]["Tables"]["user_lesson_progress"]["Update"];

// Billing types
export type PlatformConfig = Database["public"]["Tables"]["platform_config"]["Row"];
export type PricingPlan = Database["public"]["Tables"]["pricing_plans"]["Row"];
export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
export type SubscriptionInsert = Database["public"]["Tables"]["subscriptions"]["Insert"];
export type CreditTransaction = Database["public"]["Tables"]["credit_transactions"]["Row"];
export type CreditTransactionInsert = Database["public"]["Tables"]["credit_transactions"]["Insert"];
export type Referral = Database["public"]["Tables"]["referrals"]["Row"];
export type ReferralInsert = Database["public"]["Tables"]["referrals"]["Insert"];

// Leaderboard types
export type UserDailyActivity = Database["public"]["Tables"]["user_daily_activity"]["Row"];
export type UserDailyActivityInsert = Database["public"]["Tables"]["user_daily_activity"]["Insert"];
export type WeeklyLeaderboardSnapshot = Database["public"]["Tables"]["weekly_leaderboard_snapshots"]["Row"];
export type LeaderboardRewardRow = Database["public"]["Tables"]["leaderboard_rewards"]["Row"];
export type ActivityFlag = Database["public"]["Tables"]["activity_flags"]["Row"];
export type ActivityFlagInsert = Database["public"]["Tables"]["activity_flags"]["Insert"];

// Help types
export type HelpEntry = Database["public"]["Tables"]["help_entries"]["Row"];
export type HelpEntryInsert = Database["public"]["Tables"]["help_entries"]["Insert"];
export type HelpEntryUpdate = Database["public"]["Tables"]["help_entries"]["Update"];

// Tips types
export type Tip = Database["public"]["Tables"]["tips"]["Row"];
export type TipInsert = Database["public"]["Tables"]["tips"]["Insert"];
export type TipUpdate = Database["public"]["Tables"]["tips"]["Update"];
export type TipWord = Database["public"]["Tables"]["tip_words"]["Row"];
export type TipWordInsert = Database["public"]["Tables"]["tip_words"]["Insert"];
export type UserTipDismissal = Database["public"]["Tables"]["user_tip_dismissals"]["Row"];
