import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { fetchSessionContext } from '@/lib/auth/permissions'
import type { Game, PlayerAlias, PlayerPublic } from '@/types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: player } = await supabase
    .from('players_public')
    .select('display_name')
    .eq('id', id)
    .single() as { data: { display_name: string } | null; error: unknown }

  return { title: player ? `${player.display_name} — FCDA` : 'Jogador — FCDA' }
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await fetchSessionContext()

  if (!session) {
    redirect(`/auth/login?redirectTo=/players/${id}`)
  }

  const supabase = await createClient()

  const { data: player } = await supabase
    .from('players_public')
    .select('id, display_name, shirt_number, current_rating, profile_id')
    .eq('id', id)
    .single() as { data: PlayerPublic | null; error: unknown }

  if (!player) notFound()

  const { data: aliases } = await supabase
    .from('player_aliases')
    .select('id, alias_display')
    .eq('player_id', id)
    .order('alias_display') as { data: Pick<PlayerAlias, 'id' | 'alias_display'>[] | null; error: unknown }

  const { data: gps } = await supabase
    .from('game_players')
    .select('game_id, team')
    .eq('player_id', id) as { data: { game_id: string; team: string | null }[] | null; error: unknown }

  const gameIds = (gps ?? []).map((gp) => gp.game_id)

  let matchesPlayed = 0
  if (gameIds.length > 0) {
    const { count } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true })
      .in('id', gameIds)
      .eq('status', 'finished')
      .eq('counts_for_stats', true)
    matchesPlayed = count ?? 0
  }

  type MatchRow = {
    game_id: string
    team: string | null
    date: string
    location: string
    score_a: number | null
    score_b: number | null
    rating: number | null
  }
  const isOwnProfile = !!player.profile_id && player.profile_id === session.userId
  let matchHistory: MatchRow[] = []

  if (isOwnProfile && gameIds.length > 0) {
    const teamByGame = new Map((gps ?? []).map((gp) => [gp.game_id, gp.team]))

    const { data: games } = await supabase
      .from('games')
      .select('id, date, location, score_a, score_b')
      .in('id', gameIds)
      .eq('status', 'finished')
      .eq('counts_for_stats', true)
      .order('date', { ascending: false }) as {
        data: Pick<Game, 'id' | 'date' | 'location' | 'score_a' | 'score_b'>[] | null
        error: unknown
      }

    const { data: ratings } = await supabase
      .from('rating_submissions')
      .select('game_id, rating')
      .eq('rated_player_id', id)
      .eq('status', 'approved')
      .in('game_id', gameIds) as {
        data: { game_id: string; rating: number }[] | null
        error: unknown
      }

    const ratingByGame = new Map((ratings ?? []).map((r) => [r.game_id, r.rating]))

    matchHistory = (games ?? []).map((g) => ({
      game_id: g.id,
      team: teamByGame.get(g.id) ?? null,
      date: g.date,
      location: g.location,
      score_a: g.score_a,
      score_b: g.score_b,
      rating: ratingByGame.get(g.id) ?? null,
    }))
  }

  const dateStr = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })

  return (
    <div className="container max-w-screen-md mx-auto px-4 py-8 space-y-8">
      {/* Basic info */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          {player.shirt_number != null && (
            <span className="text-3xl font-bold text-muted-foreground tabular-nums">
              #{player.shirt_number}
            </span>
          )}
          <h1 className="text-2xl font-bold text-fcda-navy">{player.display_name}</h1>
        </div>
        {(aliases ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {(aliases ?? []).map((a) => (
              <span
                key={a.id}
                className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full"
              >
                {a.alias_display}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Nota</p>
          <p className="text-2xl font-bold text-fcda-navy">
            {player.current_rating != null ? player.current_rating.toFixed(1) : '—'}
          </p>
        </div>
        <div className="rounded-lg border border-border p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Jogos</p>
          <p className="text-2xl font-bold text-fcda-navy">{matchesPlayed}</p>
        </div>
      </div>

      {/* Match history — own profile only */}
      {isOwnProfile && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Histórico
          </h2>
          {matchHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem jogos registados.</p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-fcda-navy text-white text-xs uppercase tracking-wide">
                    <th className="px-4 py-2.5 text-left font-semibold">Data</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Local</th>
                    <th className="px-4 py-2.5 text-center font-semibold">Equipa</th>
                    <th className="px-4 py-2.5 text-center font-semibold">Resultado</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {matchHistory.map((m, i) => (
                    <tr
                      key={m.game_id}
                      className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}
                    >
                      <td className="px-4 py-2.5 whitespace-nowrap">{dateStr(m.date)}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{m.location}</td>
                      <td className="px-4 py-2.5 text-center">
                        {m.team === 'a' ? 'Branca' : m.team === 'b' ? 'Preta' : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center tabular-nums font-medium">
                        {m.score_a != null && m.score_b != null
                          ? `${m.score_a}–${m.score_b}`
                          : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                        {m.rating != null ? m.rating.toFixed(1) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
