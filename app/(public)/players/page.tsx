import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchSessionContext, canAccessMod } from '@/lib/auth/permissions'
import {
  resolveLinkedPlayerIdentity,
  signPlayerAvatarRecords,
} from '@/lib/players/avatar.server'
import { PlayersTable } from '@/components/player/PlayersTable'
import type { PlayerPublic, PlayerStats } from '@/types'

export const metadata = { title: 'Jogadores — FCDA' }

export default async function PlayersPage() {
  const session = await fetchSessionContext()

  if (!session) {
    redirect('/auth/login?redirectTo=/players')
  }

  const supabase = await createClient()
  const isApproved = session.profile.approved
  const canViewRatings = canAccessMod(session.roles)
  const linkedPlayer = await resolveLinkedPlayerIdentity(session.userId, isApproved)

  const [playersRes, statsRes] = await Promise.all([
    supabase
      .from('players_public')
      .select(
        canViewRatings
          ? 'id, display_name, shirt_number, current_rating, profile_id, avatar_path'
          : 'id, display_name, shirt_number, profile_id, avatar_path'
      )
      .order('shirt_number', { ascending: true, nullsFirst: false })
      .order('display_name', { ascending: true })
      .overrideTypes<
        Array<
          Pick<
            PlayerPublic,
            | 'id'
            | 'display_name'
            | 'shirt_number'
            | 'profile_id'
            | 'avatar_path'
          > & { current_rating?: number | null }
        >,
        { merge: false }
      >(),
    supabase
      .from('player_stats')
      .select('id, total_all')
      .overrideTypes<Array<Pick<PlayerStats, 'id' | 'total_all'>>, { merge: false }>(),
  ])

  const totalsByPlayerId = new Map((statsRes.data ?? []).map((row) => [row.id, row.total_all]))
  const signedPlayers = await signPlayerAvatarRecords(playersRes.data ?? [], isApproved)
  const rows = signedPlayers.map((player) => ({
    ...player,
    total_all: totalsByPlayerId.get(player.id) ?? 0,
  }))

  return (
    <div className="container max-w-screen-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-fcda-navy mb-6">Jogadores</h1>
      <PlayersTable
        players={rows}
        isApproved={isApproved}
        canViewRatings={canViewRatings}
        highlightedPlayerId={linkedPlayer?.id ?? null}
      />
    </div>
  )
}
