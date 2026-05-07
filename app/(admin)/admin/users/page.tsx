import { createServiceClient } from '@/lib/supabase/server'
import { signPlayerAvatarRecords } from '@/lib/players/avatar.server'
import { TranslatedText } from '@/components/i18n/TranslatedText'
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
    feedback_games_loaded?: boolean
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

  const users: UserRow[] = profileList.map((p) => {
    const player = playerByProfile.get(p.id)
    return {
      id: p.id,
      display_name: p.display_name,
      email: null,
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
            feedback_games: [],
            feedback_games_loaded: false,
          }
        : null,
    }
  })

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold text-fcda-navy sm:text-2xl"><TranslatedText i18nKey="admin.users" /></h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <TranslatedText i18nKey="admin.userCount" values={{ count: users.length }} />
        </p>
      </div>
      <UserTable users={users} />
    </div>
  )
}
