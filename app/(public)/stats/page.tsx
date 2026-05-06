import { createClient } from '@/lib/supabase/server'
import { fetchSessionContext } from '@/lib/auth/permissions'
import {
  resolveLinkedPlayerIdentity,
  signPlayerAvatarRecords,
} from '@/lib/players/avatar.server'
import { StatsPageHero } from '@/components/stats/StatsPageHero'
import { StatsTable } from '@/components/stats/StatsTable'
import {
  buildLeaderboardFormByPlayerId,
  type LeaderboardFormByPlayerId,
  type LeaderboardFormMatch,
} from '@/lib/stats/leaderboard'
import type { PlayerStats } from '@/types'

export const metadata = { title: 'Leaderboard — FCDA' }

export default async function StatsPage() {
  const supabase = await createClient()
  const session = await fetchSessionContext()
  const isApproved = session?.profile?.approved ?? false
  const linkedPlayer = session
    ? await resolveLinkedPlayerIdentity(session.userId, isApproved)
    : null

  const { data: players } = await supabase
    .from('player_stats')
    .select('id, display_name, shirt_number, nationality, profile_id, avatar_path, total_all, total_comp, wins_all, draws_all, losses_all, wins_comp, draws_comp, losses_comp')
    .not('profile_id', 'is', null)
    .overrideTypes<Array<PlayerStats>, { merge: false }>()
  const rows = await signPlayerAvatarRecords(players ?? [], isApproved)
  const playerIds = rows.map((player) => player.id)
  let formByPlayerId: LeaderboardFormByPlayerId = {}

  if (playerIds.length > 0) {
    const { data: gamePlayers } = await supabase
      .from('game_players')
      .select('game_id, player_id, team')
      .in('player_id', playerIds) as {
        data: Array<{
          game_id: string
          player_id: string
          team: 'a' | 'b' | null
        }> | null
        error: unknown
      }

    const gameIds = [...new Set((gamePlayers ?? []).map((entry) => entry.game_id))]

    if (gameIds.length > 0) {
      const { data: games } = await supabase
        .from('games')
        .select('id, date, counts_for_stats, score_a, score_b')
        .in('id', gameIds)
        .eq('status', 'finished') as {
          data: Array<{
            id: string
            date: string
            counts_for_stats: boolean
            score_a: number | null
            score_b: number | null
          }> | null
          error: unknown
        }

      const gamesById = new Map((games ?? []).map((game) => [game.id, game]))
      const formMatches: LeaderboardFormMatch[] = (gamePlayers ?? [])
        .map((entry) => {
          const game = gamesById.get(entry.game_id)
          if (!game) return null

          return {
            player_id: entry.player_id,
            game_id: entry.game_id,
            team: entry.team,
            date: game.date,
            counts_for_stats: game.counts_for_stats,
            score_a: game.score_a,
            score_b: game.score_b,
          }
        })
        .filter((entry): entry is LeaderboardFormMatch => entry != null)

      formByPlayerId = buildLeaderboardFormByPlayerId(formMatches)
    }
  }

  return (
    <div className="bg-white">
      <StatsPageHero />

      <main className="container mx-auto max-w-screen-xl px-4 py-8 md:py-10">
        <StatsTable
          players={rows}
          formByPlayerId={formByPlayerId}
          isAnonymised={!isApproved}
          highlightedPlayerId={linkedPlayer?.id ?? null}
          friendlyRankingToggle
        />
      </main>
    </div>
  )
}
