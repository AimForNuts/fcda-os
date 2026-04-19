import { createServiceClient } from '@/lib/supabase/server'
import { AdminNav } from '@/components/admin/AdminNav'
import { PlayerTable } from './PlayerTable'

export type PlayerRow = {
  id: string
  sheet_name: string
  shirt_number: number | null
  current_rating: number | null
  preferred_positions: string[]
  profile_id: string | null
  profile_name: string | null
  aliases: Array<{ id: string; alias_display: string }>
}

export default async function PlayersPage() {
  const admin = createServiceClient()

  // 1. All players sorted alphabetically
  const { data: players } = await admin
    .from('players')
    .select('id, sheet_name, shirt_number, current_rating, preferred_positions, profile_id')
    .order('sheet_name') as {
      data: Array<{
        id: string
        sheet_name: string
        shirt_number: number | null
        current_rating: number | null
        preferred_positions: string[]
        profile_id: string | null
      }> | null
      error: unknown
    }

  const playerList = players ?? []
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

  let profileNames: Map<string, string> = new Map()
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

  const rows: PlayerRow[] = playerList.map((p) => ({
    id: p.id,
    sheet_name: p.sheet_name,
    shirt_number: p.shirt_number,
    current_rating: p.current_rating,
    preferred_positions: p.preferred_positions ?? [],
    profile_id: p.profile_id,
    profile_name: p.profile_id ? (profileNames.get(p.profile_id) ?? null) : null,
    aliases: aliasesByPlayer.get(p.id) ?? [],
  }))

  return (
    <div className="space-y-6">
      <AdminNav />
      <div>
        <h1 className="text-2xl font-bold text-fcda-navy">Jogadores</h1>
        <p className="text-sm text-muted-foreground mt-1">{rows.length} jogadores</p>
      </div>
      <PlayerTable players={rows} />
    </div>
  )
}
