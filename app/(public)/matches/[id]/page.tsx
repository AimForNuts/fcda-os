import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { fetchSessionContext, canAccessMod } from '@/lib/auth/permissions'
import { signPlayerAvatarRecords } from '@/lib/players/avatar.server'
import { LineupGrid } from '@/components/matches/LineupGrid'
import { MatchScoreHero } from '@/components/matches/MatchScoreHero'
import { GameDateTime } from '@/components/matches/GameDateTime'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { PlayerPublic, GamePlayer, Game } from '@/types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: game } = await supabase
    .from('games')
    .select('date, location')
    .eq('id', id)
    .single() as { data: { date: string; location: string } | null; error: unknown }

  if (!game) return { title: 'Jogo — FCDA' }

  const d = new Date(game.date)
  const dateStr = d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
  return { title: `${dateStr} · ${game.location} — FCDA` }
}

const STATUS_LABEL: Record<Game['status'], string> = {
  scheduled: 'Agendado',
  finished: 'Terminado',
  cancelled: 'Cancelado',
}

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Run session check and game fetch in parallel
  const [session, supabase] = await Promise.all([
    fetchSessionContext(),
    createClient(),
  ])
  const isMod = session ? canAccessMod(session.roles) : false
  const isApproved = session?.profile?.approved ?? false

  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('id', id)
    .single() as { data: Game | null; error: unknown }

  if (!game) notFound()

  const { data: gamePlayers } = await supabase
    .from('game_players')
    .select('player_id, team')
    .eq('game_id', id) as { data: Pick<GamePlayer, 'player_id' | 'team'>[] | null; error: unknown }

  const playerIds = (gamePlayers ?? []).map((gp) => gp.player_id)
  let players: Array<PlayerPublic & { avatar_url: string | null }> = []

  if (playerIds.length > 0) {
    const { data } = await supabase
      .from('players_public')
      .select('id, display_name, shirt_number, current_rating, profile_id, avatar_path')
      .in('id', playerIds)
    players = await signPlayerAvatarRecords(data ?? [], isApproved)
  }

  const showRateButton =
    game.status === 'finished' &&
    game.counts_for_stats === true &&
    isApproved &&
    !!session &&
    players.some((p) => p.profile_id === session.userId)

  const playerMap = new Map(players.map((p) => [p.id, p]))
  const gpList = gamePlayers ?? []

  const teamA = gpList
    .filter((gp) => gp.team === 'a')
    .map((gp) => playerMap.get(gp.player_id))
    .filter((p): p is (PlayerPublic & { avatar_url: string | null }) => p != null)

  const teamB = gpList
    .filter((gp) => gp.team === 'b')
    .map((gp) => playerMap.get(gp.player_id))
    .filter((p): p is (PlayerPublic & { avatar_url: string | null }) => p != null)

  const unassigned = gpList
    .filter((gp) => !gp.team)
    .map((gp) => playerMap.get(gp.player_id))
    .filter((p): p is (PlayerPublic & { avatar_url: string | null }) => p != null)

  return (
    <div className="container max-w-screen-md mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">
            <GameDateTime iso={game.date} />
          </p>
          <p className="text-sm text-muted-foreground">{game.location}</p>
        </div>
        <Badge
          variant={
            game.status === 'finished'
              ? 'default'
              : game.status === 'cancelled'
                ? 'destructive'
                : 'secondary'
          }
        >
          {STATUS_LABEL[game.status]}
        </Badge>
      </div>

      {/* Mod action buttons */}
      {isMod && (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href={`/mod/games/${id}/edit`} />}
          >
            Editar jogo
          </Button>
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href={`/mod/games/${id}/lineup`} />}
          >
            Gerir convocados
          </Button>
          {game.status === 'scheduled' && (
            <Button
              size="sm"
              className="bg-fcda-gold text-fcda-navy hover:bg-fcda-gold/90 font-semibold"
              nativeButton={false}
              render={<Link href={`/mod/games/${id}/finish`} />}
            >
              Terminar jogo
            </Button>
          )}
        </div>
      )}

      {/* Score */}
      {game.status !== 'cancelled' && (
        <MatchScoreHero scoreA={game.score_a} scoreB={game.score_b} />
      )}

      {/* Rate button */}
      {showRateButton && (
        <div className="flex pt-1">
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href={`/matches/${id}/rate`} />}
          >
            Avaliar colegas
          </Button>
        </div>
      )}

      {/* Lineup */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
          Convocatória
        </h2>
        <LineupGrid teamA={teamA} teamB={teamB} unassigned={unassigned} isApproved={isApproved} />
      </div>
    </div>
  )
}
