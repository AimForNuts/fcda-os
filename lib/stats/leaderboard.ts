import type { PlayerStats } from '@/types'

export type LeaderboardMode = 'all' | 'competitive'
export type LeaderboardFormResult = 'win' | 'draw' | 'loss'

export type LeaderboardFormByPlayerId = Record<
  string,
  {
    all: LeaderboardFormResult[]
    competitive: LeaderboardFormResult[]
  }
>

export type LeaderboardFormMatch = {
  player_id: string
  game_id: string
  team: 'a' | 'b' | null
  date: string
  counts_for_stats: boolean
  score_a: number | null
  score_b: number | null
}

export type LeaderboardPlayer = PlayerStats & {
  avatar_url?: string | null
}

export type LeaderboardRow = LeaderboardPlayer & {
  total: number
  wins: number
  draws: number
  losses: number
  points: number
  pointsPerGame: number
  winRate: number
  form: LeaderboardFormResult[]
  standing: number
}

export function normalizeLeaderboardSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-PT')
}

export function compareLeaderboardRows(
  a: Pick<LeaderboardRow, 'points' | 'wins' | 'total'>,
  b: Pick<LeaderboardRow, 'points' | 'wins' | 'total'>,
): number {
  if (b.points !== a.points) return b.points - a.points
  if (b.wins !== a.wins) return b.wins - a.wins
  return b.total - a.total
}

export function toLeaderboardRow(
  player: LeaderboardPlayer,
  mode: LeaderboardMode,
  formByPlayerId: LeaderboardFormByPlayerId = {},
): Omit<LeaderboardRow, 'standing'> {
  const total = mode === 'all' ? player.total_all : player.total_comp
  const wins = mode === 'all' ? player.wins_all : player.wins_comp
  const draws = mode === 'all' ? player.draws_all : player.draws_comp
  const losses = mode === 'all' ? player.losses_all : player.losses_comp
  const points = 3 * wins + draws

  return {
    ...player,
    total,
    wins,
    draws,
    losses,
    points,
    pointsPerGame: total > 0 ? points / total : 0,
    winRate: total > 0 ? wins / total : 0,
    form: formByPlayerId[player.id]?.[mode] ?? [],
  }
}

export function buildLeaderboardRows(
  players: LeaderboardPlayer[],
  mode: LeaderboardMode,
  formByPlayerId: LeaderboardFormByPlayerId = {},
): LeaderboardRow[] {
  const rows = players.map((player) => toLeaderboardRow(player, mode, formByPlayerId))
  const sortedRows = [...rows].sort(compareLeaderboardRows)
  const standingById = new Map<string, number>()

  let previousRow: Omit<LeaderboardRow, 'standing'> | null = null
  let previousStanding = 0

  sortedRows.forEach((row, index) => {
    const standing =
      previousRow && compareLeaderboardRows(previousRow, row) === 0
        ? previousStanding
        : index + 1

    standingById.set(row.id, standing)
    previousRow = row
    previousStanding = standing
  })

  return rows.map((row) => ({
    ...row,
    standing: standingById.get(row.id) ?? 0,
  }))
}

export function filterLeaderboardRows(
  rows: LeaderboardRow[],
  searchValue: string,
): LeaderboardRow[] {
  const query = normalizeLeaderboardSearch(searchValue.trim())

  if (!query) {
    return rows
  }

  return rows.filter((row) =>
    normalizeLeaderboardSearch(row.display_name).includes(query)
  )
}

export function getLeaderboardMatchResult(
  match: Pick<LeaderboardFormMatch, 'team' | 'score_a' | 'score_b'>,
): LeaderboardFormResult | null {
  if (match.team == null || match.score_a == null || match.score_b == null) {
    return null
  }

  if (match.score_a === match.score_b) {
    return 'draw'
  }

  if (match.team === 'a') {
    return match.score_a > match.score_b ? 'win' : 'loss'
  }

  return match.score_b > match.score_a ? 'win' : 'loss'
}

export function buildLeaderboardFormByPlayerId(
  matches: LeaderboardFormMatch[],
  limit = 5,
): LeaderboardFormByPlayerId {
  const formByPlayerId: LeaderboardFormByPlayerId = {}
  const sortedMatches = [...matches].sort((a, b) => {
    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime()
    if (dateDiff !== 0) return dateDiff
    return a.game_id.localeCompare(b.game_id)
  })

  for (const match of sortedMatches) {
    const result = getLeaderboardMatchResult(match)
    if (!result) continue

    const form = formByPlayerId[match.player_id] ?? {
      all: [],
      competitive: [],
    }

    if (form.all.length < limit) {
      form.all.push(result)
    }

    if (match.counts_for_stats && form.competitive.length < limit) {
      form.competitive.push(result)
    }

    formByPlayerId[match.player_id] = form
  }

  return formByPlayerId
}
