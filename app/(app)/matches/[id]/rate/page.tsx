import { notFound, redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { fetchSessionContext } from '@/lib/auth/permissions'
import { signPlayerAvatarRecords } from '@/lib/players/avatar.server'
import { RatingForm } from '@/components/ratings/RatingForm'
import type { PlayerPublic } from '@/types'

export default async function RatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: gameId } = await params
  const session = await fetchSessionContext()
  // (app) layout already redirects unauthenticated/unapproved users,
  // but we still need session for userId
  if (!session) redirect('/auth/login')

  const supabase = await createClient()
  const admin = createServiceClient()

  // Fetch game
  const { data: game } = await supabase
    .from('games')
    .select('id, status, counts_for_stats, date, location')
    .eq('id', gameId)
    .single() as {
      data: {
        id: string
        status: string
        counts_for_stats: boolean
        date: string
        location: string
      } | null
      error: unknown
    }

  if (!game) notFound()
  if (game.status !== 'finished' || !game.counts_for_stats) {
    redirect(`/matches/${gameId}`)
  }

  // Find user's linked player
  const { data: linkedPlayer } = await admin
    .from('players')
    .select('id')
    .eq('profile_id', session.userId)
    .single() as { data: { id: string } | null; error: unknown }

  if (!linkedPlayer) redirect(`/matches/${gameId}`)

  // Fetch all player IDs in the lineup (also used to verify user is in the game)
  const { data: gamePlayersRows } = await supabase
    .from('game_players')
    .select('player_id, team')
    .eq('game_id', gameId) as { data: Array<{ player_id: string; team: string | null }> | null; error: unknown }

  const allPlayerIds = (gamePlayersRows ?? []).map((gp) => gp.player_id)
  if (!allPlayerIds.includes(linkedPlayer.id)) redirect(`/matches/${gameId}`)

  const submitterRow = (gamePlayersRows ?? []).find((gp) => gp.player_id === linkedPlayer.id)
  const submitterTeam = submitterRow?.team ?? null

  const teammateIds = (gamePlayersRows ?? [])
    .filter((gp) => gp.player_id !== linkedPlayer.id && gp.team != null && gp.team === submitterTeam)
    .map((gp) => gp.player_id)

  let teammates: Array<PlayerPublic & { avatar_url: string | null }> = []
  if (teammateIds.length > 0) {
    const { data } = await supabase
      .from('players_public')
      .select('id, display_name, shirt_number, nationality, current_rating, profile_id, avatar_path, description')
      .in('id', teammateIds) as { data: PlayerPublic[] | null; error: unknown }
    teammates = await signPlayerAvatarRecords(data ?? [], true)
  }

  // Fetch existing submissions for this (game, user) batch
  const { data: existingSubmissions } = await supabase
    .from('rating_submissions')
    .select('rated_player_id, rating, status, feedback')
    .eq('game_id', gameId)
    .eq('submitted_by', session.userId) as {
      data: Array<{ rated_player_id: string; rating: number; status: string; feedback: string | null }> | null
      error: unknown
    }

  const existingRatings: Record<string, number> = {}
  for (const s of existingSubmissions ?? []) {
    existingRatings[s.rated_player_id] = s.rating
  }

  const locked = (existingSubmissions ?? []).length > 0

  const existingFeedbacks: Record<string, string> = {}
  for (const s of existingSubmissions ?? []) {
    if (s.feedback) existingFeedbacks[s.rated_player_id] = s.feedback
  }

  const d = new Date(game.date)
  const dateStr = d.toLocaleDateString('pt-PT', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="container max-w-screen-md mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fcda-navy">Avaliar colegas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {dateStr.charAt(0).toUpperCase() + dateStr.slice(1)} · {game.location}
        </p>
      </div>
      <RatingForm
        gameId={gameId}
        teammates={teammates}
        existingRatings={existingRatings}
        locked={locked}
        existingFeedbacks={existingFeedbacks}
      />
    </div>
  )
}
