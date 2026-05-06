import { cn } from '@/lib/utils'
import type { MatchTeam } from '@/lib/games/team-presentation'

export type PlayerMatchHistoryRow = {
  game_id: string
  team: string | null
  date: string
  location: string
  score_a: number | null
  score_b: number | null
  counts_for_stats: boolean
}

export type PlayerMatchResult = 'win' | 'draw' | 'loss'

export function matchTeam(team: string | null): MatchTeam | null {
  if (team === 'a' || team === 'b') return team
  return null
}

export function resultForPlayer(match: PlayerMatchHistoryRow): PlayerMatchResult | null {
  if (match.score_a == null || match.score_b == null) return null
  if (match.score_a === match.score_b) return 'draw'
  if (match.team === 'a') return match.score_a > match.score_b ? 'win' : 'loss'
  if (match.team === 'b') return match.score_b > match.score_a ? 'win' : 'loss'
  return null
}

export function resultLabel(result: PlayerMatchResult | null) {
  if (result === 'win') return 'VITORIA'
  if (result === 'draw') return 'EMPATE'
  if (result === 'loss') return 'DERROTA'
  return '—'
}

export function resultClassName(result: PlayerMatchResult | null) {
  return cn(
    result === 'win' && 'text-emerald-700 dark:text-emerald-400',
    result === 'draw' && 'text-amber-700 dark:text-amber-400',
    result === 'loss' && 'text-rose-700 dark:text-rose-400',
    result == null && 'text-muted-foreground',
  )
}
