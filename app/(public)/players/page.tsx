import { redirect } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { fetchSessionContext } from '@/lib/auth/permissions'
import {
  resolveLinkedPlayerIdentity,
  signPlayerAvatarRecords,
} from '@/lib/players/avatar.server'
import { PlayersTable } from '@/components/player/PlayersTable'
import type { Player, PlayerPublic, PlayerStats } from '@/types'

export const metadata = { title: 'Jogadores — FCDA' }

export default async function PlayersPage() {
  const session = await fetchSessionContext()

  if (!session) {
    redirect('/auth/login?redirectTo=/players')
  }

  const supabase = await createClient()
  const isApproved = session.profile.approved
  const linkedPlayer = await resolveLinkedPlayerIdentity(session.userId, isApproved)

  const playersQuery = isApproved
    ? supabase
        .from('players')
        .select('id, sheet_name, shirt_number, nationality, preferred_positions, profile_id, avatar_path')
        .not('profile_id', 'is', null)
        .order('shirt_number', { ascending: true, nullsFirst: false })
        .order('sheet_name', { ascending: true })
        .overrideTypes<
          Array<
            Pick<
              Player,
              | 'id'
              | 'sheet_name'
              | 'shirt_number'
              | 'nationality'
              | 'preferred_positions'
              | 'profile_id'
              | 'avatar_path'
            >
          >,
          { merge: false }
        >()
    : supabase
        .from('players_public')
        .select('id, display_name, shirt_number, nationality, profile_id, avatar_path')
        .not('profile_id', 'is', null)
        .order('shirt_number', { ascending: true, nullsFirst: false })
        .order('display_name', { ascending: true })
        .overrideTypes<
          Array<
            Pick<
              PlayerPublic,
              | 'id'
              | 'display_name'
              | 'shirt_number'
              | 'nationality'
              | 'profile_id'
              | 'avatar_path'
            >
          >,
          { merge: false }
        >()

  const [playersRes, statsRes] = await Promise.all([
    playersQuery,
    supabase
      .from('player_stats')
      .select('id, total_all')
      .overrideTypes<Array<Pick<PlayerStats, 'id' | 'total_all'>>, { merge: false }>(),
  ])

  const totalsByPlayerId = new Map((statsRes.data ?? []).map((row) => [row.id, row.total_all]))
  const playerRows = (playersRes.data ?? []).map((player) =>
    'sheet_name' in player
      ? {
          id: player.id,
          display_name: player.sheet_name,
          shirt_number: player.shirt_number,
          nationality: player.nationality,
          profile_id: player.profile_id,
          avatar_path: player.avatar_path,
          preferred_positions: player.preferred_positions ?? [],
        }
      : {
          ...player,
          preferred_positions: [],
        }
  )
  const signedPlayers = await signPlayerAvatarRecords(playerRows, isApproved)
  const rows = signedPlayers.map((player) => ({
    ...player,
    total_all: totalsByPlayerId.get(player.id) ?? 0,
  }))

  return (
    <div className="bg-white">
      <section className="bg-fcda-navy text-white">
        <div className="container mx-auto grid max-w-screen-xl gap-8 px-4 py-10 md:grid-cols-[1fr_auto] md:items-end md:py-14">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-fcda-gold">
              Futebol Clube Dragões da Areosa
            </p>
            <h1 className="mt-3 text-5xl font-black uppercase tracking-tight md:text-7xl">
              Plantel
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 md:text-base">
              Consulta os jogadores, entra no perfil individual e acompanha os jogos do grupo.
            </p>
          </div>
          <Image
            src="/crest.png"
            alt=""
            width={160}
            height={160}
            className="hidden h-40 w-40 object-contain opacity-90 drop-shadow-lg md:block"
            aria-hidden
          />
        </div>
      </section>

      <main className="container mx-auto max-w-screen-xl px-4 py-8 md:py-10">
        <PlayersTable
          players={rows}
          isApproved={isApproved}
          highlightedPlayerId={linkedPlayer?.id ?? null}
        />
      </main>
    </div>
  )
}
