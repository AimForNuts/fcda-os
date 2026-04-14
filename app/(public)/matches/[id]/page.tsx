import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LineupGrid } from '@/components/matches/LineupGrid'
import { Badge } from '@/components/ui/badge'
import type { PlayerPublic, GamePlayer, Game } from '@/types'

export const metadata = { title: 'Jogo — FCDA' }

const STATUS_LABEL: Record<string, string> = {
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
  const supabase = await createClient()

  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('id', id)
    .single() as { data: Game | null; error: unknown }

  if (!game) notFound()

  // Fetch game_players, then resolve player names via players_public view.
  // The view handles anonymisation: guests see "Jogador N", approved members see real names.
  const { data: gamePlayers } = await supabase
    .from('game_players')
    .select('player_id, team')
    .eq('game_id', id) as { data: Pick<GamePlayer, 'player_id' | 'team'>[] | null; error: unknown }

  const playerIds = (gamePlayers ?? []).map((gp) => gp.player_id)
  let players: PlayerPublic[] = []

  if (playerIds.length > 0) {
    const { data } = await supabase
      .from('players_public')
      .select('id, display_name, shirt_number, current_rating, profile_id')
      .in('id', playerIds)
    players = data ?? []
  }

  const playerMap = new Map(players.map((p) => [p.id, p]))
  const gpList = gamePlayers ?? []

  const teamA = gpList
    .filter((gp) => gp.team === 'a')
    .map((gp) => playerMap.get(gp.player_id))
    .filter((p): p is PlayerPublic => p != null)

  const teamB = gpList
    .filter((gp) => gp.team === 'b')
    .map((gp) => playerMap.get(gp.player_id))
    .filter((p): p is PlayerPublic => p != null)

  const unassigned = gpList
    .filter((gp) => !gp.team)
    .map((gp) => playerMap.get(gp.player_id))
    .filter((p): p is PlayerPublic => p != null)

  const d = new Date(game.date)
  const dateStr = d.toLocaleDateString('pt-PT', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  const timeStr = d.toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="container max-w-screen-md mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-sm font-medium capitalize">
            {dateStr} · {timeStr}
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

      {/* Score — only shown for finished games */}
      {game.status === 'finished' &&
        game.score_a != null &&
        game.score_b != null && (
          <div className="flex items-center justify-center gap-8 py-8 rounded-lg bg-fcda-navy text-white">
            <div className="text-center">
              <p className="text-xs uppercase tracking-widest text-white/60 mb-1">
                Equipa Branca
              </p>
              <span className="text-5xl font-extrabold tabular-nums">
                {game.score_a}
              </span>
            </div>
            <span className="text-xl font-bold text-fcda-gold">VS</span>
            <div className="text-center">
              <p className="text-xs uppercase tracking-widest text-white/60 mb-1">
                Equipa Preta
              </p>
              <span className="text-5xl font-extrabold tabular-nums">
                {game.score_b}
              </span>
            </div>
          </div>
        )}

      {/* Lineup */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
          Convocatória
        </h2>
        <LineupGrid teamA={teamA} teamB={teamB} unassigned={unassigned} />
      </div>
    </div>
  )
}
