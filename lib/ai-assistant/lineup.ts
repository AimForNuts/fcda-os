import { z } from 'zod'
import { getTeamPresentation } from '@/lib/games/team-presentation'

export const AiLineupPlayerSchema = z.object({
  player_id: z.string().uuid(),
  is_captain: z.boolean(),
})

export const AiLineupTeamSchema = z.object({
  label: z.string(),
  players: z.array(AiLineupPlayerSchema),
})

export const AiLineupSchema = z.object({
  team_a: AiLineupTeamSchema,
  team_b: AiLineupTeamSchema,
  notes: z.array(z.string()),
  reasoning: z.array(z.string()),
})

export type AiLineup = z.infer<typeof AiLineupSchema>
export type AiLineupPlayer = z.infer<typeof AiLineupPlayerSchema>
export type MatchTeam = 'a' | 'b'

export function createAiLineupSchema(rosterPlayerIds: string[]) {
  if (rosterPlayerIds.length === 0) return AiLineupSchema

  const rosterPlayerIdSchema = z.enum(rosterPlayerIds as [string, ...string[]])
  const rosterLineupPlayerSchema = AiLineupPlayerSchema.extend({
    player_id: rosterPlayerIdSchema,
  })
  const rosterLineupTeamSchema = AiLineupTeamSchema.extend({
    players: z.array(rosterLineupPlayerSchema),
  })

  return AiLineupSchema.extend({
    team_a: rosterLineupTeamSchema,
    team_b: rosterLineupTeamSchema,
  })
}

export type PlayerForAiLineup = {
  id: string
  sheet_name: string
  shirt_number: number | null
  nationality: string
  current_rating: number | null
  preferred_positions: string[]
  last3Ratings: number[]
  totalGames: number
  winPct: number | null
  recentFeedback: string[]
}

export type PlayerPreview = {
  player_id: string
  sheet_name: string
  shirt_number: number | null
  nationality: string
  current_rating: number | null
  preferred_positions: string[]
  avatar_url: string | null
  is_captain: boolean
}

export type AiLineupPreview = {
  game_id: string
  team_a: {
    label: string
    players: PlayerPreview[]
    rating_total: number
    average_rating: number
  }
  team_b: {
    label: string
    players: PlayerPreview[]
    rating_total: number
    average_rating: number
  }
  balance: {
    rating_delta: number
    player_count_delta: number
  }
  notes: string[]
  reasoning: string[]
}

export function buildPlayerTable(players: PlayerForAiLineup[]): string {
  const lines = players.map((p) => {
    const rating = p.current_rating != null && p.current_rating > 0 ? p.current_rating.toFixed(1) : 'unrated'
    const pos = p.preferred_positions.length > 0 ? p.preferred_positions.join(', ') : 'no position'
    const last3 = p.last3Ratings.length > 0 ? p.last3Ratings.map((r) => r.toFixed(1)).join(' / ') : '-'
    const games = p.totalGames > 0 ? `${p.totalGames} (Win: ${p.winPct}%)` : '0'
    const feedback = p.recentFeedback.length > 0 ? p.recentFeedback.map((f) => `"${f}"`).join(' ') : '-'
    return `- ${p.sheet_name} (player_id: ${p.id}) | Rating: ${rating} | Positions: ${pos} | Last 3: ${last3} | Games: ${games} | Feedback data: ${feedback}`
  })
  return `Current player ratings table:\n${lines.join('\n')}`
}

type ValidateAiLineupOptions = {
  playerLabels?: Map<string, string> | Record<string, string>
}

function formatPlayerId(playerId: string, playerLabels?: ValidateAiLineupOptions['playerLabels']) {
  const label = playerLabels instanceof Map ? playerLabels.get(playerId) : playerLabels?.[playerId]
  return label ? `${label} (${playerId})` : playerId
}

function formatPlayerIds(playerIds: string[], playerLabels?: ValidateAiLineupOptions['playerLabels']) {
  return playerIds.map((id) => formatPlayerId(id, playerLabels)).join(', ')
}

export function validateAiLineup(
  lineup: AiLineup,
  rosterPlayerIds: string[],
  options: ValidateAiLineupOptions = {}
) {
  const rosterSet = new Set(rosterPlayerIds)
  const seen = new Set<string>()
  const duplicateIds = new Set<string>()
  const outsiderIds = new Set<string>()
  const allPlayers = [...lineup.team_a.players, ...lineup.team_b.players]

  for (const player of allPlayers) {
    if (seen.has(player.player_id)) duplicateIds.add(player.player_id)
    seen.add(player.player_id)
    if (!rosterSet.has(player.player_id)) outsiderIds.add(player.player_id)
  }

  const missingIds = rosterPlayerIds.filter((id) => !seen.has(id))
  const captainCountA = lineup.team_a.players.filter((p) => p.is_captain).length
  const captainCountB = lineup.team_b.players.filter((p) => p.is_captain).length

  const errors: string[] = []
  if (duplicateIds.size > 0) {
    errors.push(`Duplicate players: ${formatPlayerIds([...duplicateIds], options.playerLabels)}`)
  }
  if (outsiderIds.size > 0) {
    errors.push(`Players outside roster: ${formatPlayerIds([...outsiderIds], options.playerLabels)}`)
  }
  if (missingIds.length > 0) {
    errors.push(`Missing players: ${formatPlayerIds(missingIds, options.playerLabels)}`)
  }
  if (captainCountA !== 1) errors.push('Team White must have exactly one captain')
  if (captainCountB !== 1) errors.push('Team Blue must have exactly one captain')

  return {
    ok: errors.length === 0,
    errors,
  }
}

function teamPreview(
  label: string,
  aiPlayers: AiLineupPlayer[],
  playerMap: Map<string, PlayerForAiLineup & { avatar_url: string | null }>
) {
  const players = aiPlayers.map((aiPlayer) => {
    const player = playerMap.get(aiPlayer.player_id)
    if (!player) {
      throw new Error(`Missing player context for ${aiPlayer.player_id}`)
    }
    return {
      player_id: player.id,
      sheet_name: player.sheet_name,
      shirt_number: player.shirt_number,
      nationality: player.nationality,
      current_rating: player.current_rating,
      preferred_positions: player.preferred_positions,
      avatar_url: player.avatar_url,
      is_captain: aiPlayer.is_captain,
    }
  })
  const rating_total = players.reduce((sum, p) => sum + (p.current_rating ?? 0), 0)
  return {
    label,
    players,
    rating_total,
    average_rating: players.length > 0 ? rating_total / players.length : 0,
  }
}

export function buildLineupPreview(
  gameId: string,
  lineup: AiLineup,
  players: Array<PlayerForAiLineup & { avatar_url: string | null }>
): AiLineupPreview {
  const playerMap = new Map(players.map((p) => [p.id, p]))
  const team_a = teamPreview(getTeamPresentation('a').label, lineup.team_a.players, playerMap)
  const team_b = teamPreview(getTeamPresentation('b').label, lineup.team_b.players, playerMap)

  return {
    game_id: gameId,
    team_a,
    team_b,
    balance: {
      rating_delta: Math.abs(team_a.rating_total - team_b.rating_total),
      player_count_delta: Math.abs(team_a.players.length - team_b.players.length),
    },
    notes: lineup.notes,
    reasoning: lineup.reasoning,
  }
}
