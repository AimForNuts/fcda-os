export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          approved: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name: string
          approved?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          display_name?: string
          approved?: boolean
          updated_at?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: 'player' | 'mod' | 'admin'
          assigned_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: 'player' | 'mod' | 'admin'
          assigned_by?: string | null
          created_at?: string
        }
        Update: never
      }
      players: {
        Row: {
          id: string
          sheet_name: string
          shirt_number: number | null
          current_rating: number | null
          profile_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sheet_name: string
          shirt_number?: number | null
          current_rating?: number | null
          profile_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          sheet_name?: string
          shirt_number?: number | null
          current_rating?: number | null
          profile_id?: string | null
          updated_at?: string
        }
      }
      player_aliases: {
        Row: {
          id: string
          player_id: string
          alias: string
          alias_display: string
          created_at: string
        }
        Insert: {
          id?: string
          player_id: string
          alias: string
          alias_display: string
          created_at?: string
        }
        Update: never
      }
      games: {
        Row: {
          id: string
          date: string
          location: string
          status: 'scheduled' | 'finished' | 'cancelled'
          counts_for_stats: boolean
          score_a: number | null
          score_b: number | null
          created_by: string
          finished_by: string | null
          finished_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          date: string
          location: string
          status?: 'scheduled' | 'finished' | 'cancelled'
          counts_for_stats?: boolean
          score_a?: number | null
          score_b?: number | null
          created_by: string
          finished_by?: string | null
          finished_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          date?: string
          location?: string
          status?: 'scheduled' | 'finished' | 'cancelled'
          counts_for_stats?: boolean
          score_a?: number | null
          score_b?: number | null
          finished_by?: string | null
          finished_at?: string | null
          updated_at?: string
        }
      }
      game_players: {
        Row: {
          id: string
          game_id: string
          player_id: string
          team: 'a' | 'b' | null
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          player_id: string
          team?: 'a' | 'b' | null
          created_at?: string
        }
        Update: never
      }
      rating_submissions: {
        Row: {
          id: string
          game_id: string
          submitted_by: string
          rated_player_id: string
          rating: number
          status: 'pending' | 'approved' | 'rejected'
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          submitted_by: string
          rated_player_id: string
          rating: number
          status?: 'pending' | 'approved' | 'rejected'
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Update: {
          status?: 'pending' | 'approved' | 'rejected'
          reviewed_by?: string | null
          reviewed_at?: string | null
        }
      }
      rating_history: {
        Row: {
          id: string
          player_id: string
          rating: number
          previous_rating: number | null
          changed_by: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          player_id: string
          rating: number
          previous_rating?: number | null
          changed_by: string
          notes?: string | null
          created_at?: string
        }
        Update: never
      }
      feedback: {
        Row: {
          id: string
          submitted_by: string
          content: string
          status: 'open' | 'closed'
          closed_by: string | null
          closed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          submitted_by: string
          content: string
          status?: 'open' | 'closed'
          closed_by?: string | null
          closed_at?: string | null
          created_at?: string
        }
        Update: {
          status?: 'open' | 'closed'
          closed_by?: string | null
          closed_at?: string | null
        }
      }
      audit_log: {
        Row: {
          id: string
          action: string
          performed_by: string
          target_id: string | null
          target_type: string | null
          metadata: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          id?: string
          action: string
          performed_by: string
          target_id?: string | null
          target_type?: string | null
          metadata?: Record<string, unknown> | null
          created_at?: string
        }
        Update: never
      }
    }
    Views: {
      players_public: {
        Row: {
          id: string
          shirt_number: number | null
          display_name: string
          current_rating: number | null
          profile_id: string | null
        }
      }
    }
    Functions: {
      has_role: {
        Args: { p_role: string }
        Returns: boolean
      }
    }
  }
}
