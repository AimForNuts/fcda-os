import type { Database } from './database'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type UserRole = Database['public']['Tables']['user_roles']['Row']['role']
export type Player = Database['public']['Tables']['players']['Row']
export type PlayerAlias = Database['public']['Tables']['player_aliases']['Row']
export type Game = Database['public']['Tables']['games']['Row']
export type Recinto = Database['public']['Tables']['recintos']['Row']
export type GamePlayer = Database['public']['Tables']['game_players']['Row']
export type RatingSubmission = Database['public']['Tables']['rating_submissions']['Row']
export type RatingHistory = Database['public']['Tables']['rating_history']['Row']
export type Feedback = Database['public']['Tables']['feedback']['Row']
export type MatchComment = Database['public']['Tables']['match_comments']['Row']
export type AuditLog = Database['public']['Tables']['audit_log']['Row']
export type PlayerPublic = Database['public']['Views']['players_public']['Row']
export type PlayerStats = Database['public']['Views']['player_stats']['Row']

export type GameStatus = Game['status']
export type RatingSubmissionStatus = RatingSubmission['status']
export type FeedbackStatus = Feedback['status']

/** Resolved session context passed down to Server Components */
export type SessionContext = {
  userId: string
  profile: Profile
  roles: UserRole[]
}
