import { createServiceClient } from '@/lib/supabase/server'
import { signPlayerAvatarRecords } from '@/lib/players/avatar.server'
import { UserTable } from './UserTable'
import type { UserRole } from '@/types'

export type UserRow = {
  id: string
  display_name: string
  email: string | null
  approved: boolean
  roles: UserRole[]
  player: {
    id: string
    sheet_name: string
    shirt_number: number | null
    nationality: string
    current_rating: number | null
    preferred_positions: string[]
    avatar_url: string | null
    aliases: Array<{ id: string; alias_display: string }>
    feedback_games: Array<{ id: string; date: string; location: string }>
  } | null
}

export default async function UsersPage() {
  const admin = createServiceClient()

  // 1. All profiles — pending first, then alphabetical
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, display_name, approved')
    .order('approved', { ascending: true })
    .order('display_name') as {
      data: Array<{ id: string; display_name: string; approved: boolean }> | null
      error: unknown
    }

  const profileList = profiles ?? []
  const profileIds = profileList.map((p) => p.id)

  const emailByUser = new Map<string, string | null>()
  if (profileIds.length > 0) {
    let page = 1
    let lastPage = 1

    do {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
      if (error) {
        console.error('Failed to list auth users for admin users page', error)
        break
      }

      for (const authUser of data.users) {
        if (profileIds.includes(authUser.id)) {
          emailByUser.set(authUser.id, authUser.email ?? null)
        }
      }

      lastPage = 'lastPage' in data ? data.lastPage : page
      page += 1
    } while (page <= lastPage && emailByUser.size < profileIds.length)
  }

  // 2. All roles
  const { data: allRoles } = await admin
    .from('user_roles')
    .select('user_id, role') as {
      data: Array<{ user_id: string; role: UserRole }> | null
      error: unknown
    }

  // 3. Players linked to these profiles
  let linkedPlayers: Array<{
    id: string
    sheet_name: string
    shirt_number: number | null
    nationality: string
    current_rating: number | null
    preferred_positions: string[]
    profile_id: string
    avatar_url: string | null
  }> = []
  if (profileIds.length > 0) {
    const { data } = await admin
      .from('players')
      .select('id, sheet_name, shirt_number, nationality, current_rating, preferred_positions, profile_id, avatar_path')
      .in('profile_id', profileIds) as {
        data: Array<{
          id: string
          sheet_name: string
          shirt_number: number | null
          nationality: string
          current_rating: number | null
          preferred_positions: string[]
          profile_id: string
          avatar_path: string | null
        }> | null
        error: unknown
      }
    linkedPlayers = await signPlayerAvatarRecords(data ?? [], true)
  }

  // 4. Aliases for those players
  let allAliases: Array<{ id: string; player_id: string; alias_display: string }> = []
  const playerIds = linkedPlayers.map((p) => p.id)
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

  // Build lookup maps
  const rolesByUser = new Map<string, UserRole[]>()
  for (const r of allRoles ?? []) {
    if (!rolesByUser.has(r.user_id)) rolesByUser.set(r.user_id, [])
    rolesByUser.get(r.user_id)!.push(r.role)
  }

  const playerByProfile = new Map(linkedPlayers.map((p) => [p.profile_id, p]))

  const aliasesByPlayer = new Map<string, Array<{ id: string; alias_display: string }>>()
  for (const a of allAliases) {
    if (!aliasesByPlayer.has(a.player_id)) aliasesByPlayer.set(a.player_id, [])
    aliasesByPlayer.get(a.player_id)!.push({ id: a.id, alias_display: a.alias_display })
  }

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

  const users: UserRow[] = profileList.map((p) => {
    const player = playerByProfile.get(p.id)
    return {
      id: p.id,
      display_name: p.display_name,
      email: emailByUser.get(p.id) ?? null,
      approved: p.approved,
      roles: rolesByUser.get(p.id) ?? [],
      player: player
        ? {
            id: player.id,
            sheet_name: player.sheet_name,
            shirt_number: player.shirt_number,
            nationality: player.nationality,
            current_rating: player.current_rating,
            preferred_positions: player.preferred_positions ?? [],
            avatar_url: player.avatar_url,
            aliases: aliasesByPlayer.get(player.id) ?? [],
            feedback_games: feedbackGamesByPlayer.get(player.id) ?? [],
          }
        : null,
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fcda-navy">Utilizadores</h1>
        <p className="text-sm text-muted-foreground mt-1">{users.length} utilizadores</p>
      </div>
      <UserTable users={users} />
    </div>
  )
}
