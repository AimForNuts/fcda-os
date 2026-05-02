import { createServiceClient } from '@/lib/supabase/server'
import { signPlayerAvatarRecords } from '@/lib/players/avatar.server'
import { PlayerTable } from './PlayerTable'

export type PlayerRow = {
  id: string
  sheet_name: string
  shirt_number: number | null
  nationality: string
  current_rating: number | null
  preferred_positions: string[]
  profile_id: string | null
  profile_name: string | null
  avatar_url: string | null
  aliases: Array<{ id: string; alias_display: string }>
  feedback_games: Array<{ id: string; date: string; location: string }>
}

export default async function PlayersPage() {
  const admin = createServiceClient()

  // 1. All players sorted alphabetically
  const { data: players } = await admin
    .from('players')
    .select('id, sheet_name, shirt_number, nationality, current_rating, preferred_positions, profile_id, avatar_path')
    .order('sheet_name') as {
      data: Array<{
        id: string
        sheet_name: string
        shirt_number: number | null
        nationality: string
        current_rating: number | null
        preferred_positions: string[]
        profile_id: string | null
        avatar_path: string | null
      }> | null
      error: unknown
    }

  const playerList = await signPlayerAvatarRecords(players ?? [], true)
  const playerIds = playerList.map((p) => p.id)

  // 2. All aliases
  let allAliases: Array<{ id: string; player_id: string; alias_display: string }> = []
  if (playerIds.length > 0) {
    const { data } = await admin
      .from('player_aliases')
      .select('id, player_id, alias_display')
      .in('player_id', playerIds) as {
        data: Array<{ id: string; player_id: string; alias_display: string }> | null
        error: unknown
      }
    allAliases = data ?? []
  }

  // 3. Profiles for linked players
  const linkedProfileIds = playerList
    .map((p) => p.profile_id)
    .filter((id): id is string => id != null)

  const profileNames: Map<string, string> = new Map()
  if (linkedProfileIds.length > 0) {
    const { data } = await admin
      .from('profiles')
      .select('id, display_name')
      .in('id', linkedProfileIds) as {
        data: Array<{ id: string; display_name: string }> | null
        error: unknown
      }
    for (const p of data ?? []) profileNames.set(p.id, p.display_name)
  }

  // Build alias map
  const aliasesByPlayer = new Map<string, Array<{ id: string; alias_display: string }>>()
  for (const a of allAliases) {
    if (!aliasesByPlayer.has(a.player_id)) aliasesByPlayer.set(a.player_id, [])
    aliasesByPlayer.get(a.player_id)!.push({ id: a.id, alias_display: a.alias_display })
  }

  // 4. Eligible finished games for admin feedback, grouped by player
  const feedbackGamesByPlayer = new Map<string, Array<{ id: string; date: string; location: string }>>()
  if (playerIds.length > 0) {
    const { data: participation } = await admin
      .from('game_players')
      .select('player_id, game_id')
      .in('player_id', playerIds) as {
        data: Array<{ player_id: string; game_id: string }> | null
        error: unknown
      }

    const gameIds = [...new Set((participation ?? []).map((gp) => gp.game_id))]

    if (gameIds.length > 0) {
      const { data: games } = await admin
        .from('games')
        .select('id, date, location')
        .in('id', gameIds)
        .eq('status', 'finished')
        .eq('counts_for_stats', true)
        .order('date', { ascending: false }) as {
          data: Array<{ id: string; date: string; location: string }> | null
          error: unknown
        }

      const gameMap = new Map((games ?? []).map((game) => [game.id, game]))
      const gameOrder = new Map((games ?? []).map((game, index) => [game.id, index]))

      for (const gp of participation ?? []) {
        const game = gameMap.get(gp.game_id)
        if (!game) continue
        if (!feedbackGamesByPlayer.has(gp.player_id)) feedbackGamesByPlayer.set(gp.player_id, [])
        feedbackGamesByPlayer.get(gp.player_id)!.push(game)
      }

      for (const options of feedbackGamesByPlayer.values()) {
        options.sort((a, b) => (gameOrder.get(a.id) ?? 0) - (gameOrder.get(b.id) ?? 0))
      }
    }
  }

  const rows: PlayerRow[] = playerList.map((p) => ({
    id: p.id,
    sheet_name: p.sheet_name,
    shirt_number: p.shirt_number,
    nationality: p.nationality,
    current_rating: p.current_rating,
    preferred_positions: p.preferred_positions ?? [],
    profile_id: p.profile_id,
    profile_name: p.profile_id ? (profileNames.get(p.profile_id) ?? null) : null,
    avatar_url: p.avatar_url,
    aliases: aliasesByPlayer.get(p.id) ?? [],
    feedback_games: feedbackGamesByPlayer.get(p.id) ?? [],
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fcda-navy">Jogadores</h1>
        <p className="text-sm text-muted-foreground mt-1">{rows.length} jogadores</p>
      </div>
      <PlayerTable players={rows} />
    </div>
  )
}
