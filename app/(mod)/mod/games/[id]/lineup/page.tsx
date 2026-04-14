import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LineupManager } from '@/components/lineup/LineupManager'
import type { Game, GamePlayer } from '@/types'

export default async function LineupPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: game } = await supabase
    .from('games')
    .select('id, date, location, status')
    .eq('id', id)
    .single() as { data: Pick<Game, 'id' | 'date' | 'location' | 'status'> | null; error: unknown }

  if (!game) notFound()

  // Fetch current game_players
  const { data: gamePlayers } = await supabase
    .from('game_players')
    .select('player_id, team')
    .eq('game_id', id) as { data: Pick<GamePlayer, 'player_id' | 'team'>[] | null; error: unknown }

  const playerIds = (gamePlayers ?? []).map((gp) => gp.player_id)

  // Fetch player details (sheet_name, shirt_number)
  let playerDetails: Array<{ id: string; sheet_name: string; shirt_number: number | null }> = []
  if (playerIds.length > 0) {
    const { data } = await supabase
      .from('players')
      .select('id, sheet_name, shirt_number')
      .in('id', playerIds) as { data: Array<{ id: string; sheet_name: string; shirt_number: number | null }> | null; error: unknown }
    playerDetails = data ?? []
  }

  const playerMap = new Map(playerDetails.map((p) => [p.id, p]))

  const currentLineup = (gamePlayers ?? []).map((gp) => {
    const p = playerMap.get(gp.player_id)
    return {
      player_id: gp.player_id,
      sheet_name: p?.sheet_name ?? '?',
      shirt_number: p?.shirt_number ?? null,
      team: gp.team,
    }
  })

  const d = new Date(game.date)
  const dateStr = d.toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: 'short' })
  const timeStr = d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })

  if (game.status !== 'scheduled') {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-fcda-navy">Convocados</h1>
        <p className="text-sm text-muted-foreground">
          {dateStr} · {timeStr} · {game.location}
        </p>
        <p className="text-sm text-amber-600 font-medium">
          {game.status === 'finished'
            ? 'Este jogo já foi terminado — a convocatória não pode ser alterada.'
            : 'Este jogo foi cancelado — a convocatória não pode ser alterada.'}
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fcda-navy">Convocados</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {dateStr} · {timeStr} · {game.location}
        </p>
      </div>
      <LineupManager gameId={id} currentLineup={currentLineup} />
    </div>
  )
}
