import { createServiceClient } from '@/lib/supabase/server'
import { signPlayerAvatarRecords } from '@/lib/players/avatar.server'
import { UserTable } from './UserTable'
import type { UserRole } from '@/types'

export type UserRow = {
  id: string
  display_name: string
  approved: boolean
  roles: UserRole[]
  player: {
    id: string
    sheet_name: string
    shirt_number: number | null
    avatar_url: string | null
    aliases: Array<{ id: string; alias_display: string }>
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
    profile_id: string
    avatar_url: string | null
  }> = []
  if (profileIds.length > 0) {
    const { data } = await admin
      .from('players')
      .select('id, sheet_name, shirt_number, profile_id, avatar_path')
      .in('profile_id', profileIds) as {
        data: Array<{
          id: string
          sheet_name: string
          shirt_number: number | null
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

  const users: UserRow[] = profileList.map((p) => {
    const player = playerByProfile.get(p.id)
    return {
      id: p.id,
      display_name: p.display_name,
      approved: p.approved,
      roles: rolesByUser.get(p.id) ?? [],
      player: player
        ? {
            id: player.id,
            sheet_name: player.sheet_name,
            shirt_number: player.shirt_number,
            avatar_url: player.avatar_url,
            aliases: aliasesByPlayer.get(player.id) ?? [],
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
