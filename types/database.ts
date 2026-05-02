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
        Relationships: []
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
        Relationships: []
      }
      players: {
        Row: {
          id: string
          sheet_name: string
          shirt_number: number | null
          nationality: string
          current_rating: number | null
          preferred_positions: string[]
          description: string | null
          profile_id: string | null
          avatar_path: string | null
          avatar_updated_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sheet_name: string
          shirt_number?: number | null
          nationality?: string
          current_rating?: number | null
          preferred_positions?: string[]
          description?: string | null
          profile_id?: string | null
          avatar_path?: string | null
          avatar_updated_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          sheet_name?: string
          shirt_number?: number | null
          nationality?: string
          current_rating?: number | null
          preferred_positions?: string[]
          description?: string | null
          profile_id?: string | null
          avatar_path?: string | null
          avatar_updated_at?: string | null
          updated_at?: string
        }
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      game_players: {
        Row: {
          id: string
          game_id: string
          player_id: string
          team: 'a' | 'b' | null
          is_captain: boolean
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          player_id: string
          team?: 'a' | 'b' | null
          is_captain?: boolean
          created_at?: string
        }
        Update: never
        Relationships: []
      }
      rating_submissions: {
        Row: {
          id: string
          game_id: string
          submitted_by: string
          rated_player_id: string
          rating: number
          status: 'pending' | 'approved' | 'rejected' | 'processed'
          reviewed_by: string | null
          reviewed_at: string | null
          feedback: string | null
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          submitted_by: string
          rated_player_id: string
          rating: number
          status?: 'pending' | 'approved' | 'rejected' | 'processed'
          reviewed_by?: string | null
          reviewed_at?: string | null
          feedback?: string | null
          created_at?: string
        }
        Update: {
          status?: 'pending' | 'approved' | 'rejected' | 'processed'
          reviewed_by?: string | null
          reviewed_at?: string | null
          feedback?: string | null
        }
        Relationships: []
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
        Relationships: []
      }
      feedback: {
        Row: {
          id: string
          game_id: string
          submitted_by: string
          content: string
          status: 'open' | 'closed'
          closed_by: string | null
          closed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
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
        Relationships: []
      }
      match_comments: {
        Row: {
          id: string
          game_id: string
          author_id: string
          content: string
          mention_user_ids: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          game_id: string
          author_id: string
          content: string
          mention_user_ids?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          content?: string
          mention_user_ids?: string[]
          updated_at?: string
        }
        Relationships: []
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
        Relationships: []
      }
    }
    Views: {
      players_public: {
        Row: {
          id: string
          shirt_number: number | null
          nationality: string
          display_name: string
          current_rating: number | null
          profile_id: string | null
          avatar_path: string | null
          description: string | null
        }
        Relationships: []
      }
      player_stats: {
        Row: {
          id: string
          display_name: string
          shirt_number: number | null
          nationality: string
          profile_id: string | null
          avatar_path: string | null
          total_all: number
          total_comp: number
          wins_all: number
          draws_all: number
          losses_all: number
          wins_comp: number
          draws_comp: number
          losses_comp: number
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: { p_role: string }
        Returns: boolean
      }
      get_match_comment_counts: {
        Args: { p_game_ids: string[] }
        Returns: Array<{ game_id: string; comment_count: number }>
      }
    }
  }
}
