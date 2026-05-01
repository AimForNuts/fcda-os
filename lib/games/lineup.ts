export type LineupSavePlayer = {
  player_id: string
  team?: 'a' | 'b' | null
  is_captain?: boolean
}

export function validateLineupCaptains(players: LineupSavePlayer[]) {
  const captainCounts = { a: 0, b: 0 }
  const seenPlayerIds = new Set<string>()

  for (const player of players) {
    if (seenPlayerIds.has(player.player_id)) {
      return {
        ok: false,
        error: 'Lineup contains duplicate players',
        captainCounts,
      }
    }
    seenPlayerIds.add(player.player_id)

    if (!player.is_captain) continue
    if (!player.team) {
      return {
        ok: false,
        error: 'Captain must be assigned to a team',
        captainCounts,
      }
    }
    captainCounts[player.team] += 1
  }

  if (captainCounts.a > 1 || captainCounts.b > 1) {
    return {
      ok: false,
      error: 'Only one captain is allowed per team',
      captainCounts,
    }
  }

  return {
    ok: true,
    error: null,
    captainCounts,
  }
}
