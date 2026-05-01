import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { fetchSessionContext, canAccessAdmin, canAccessMod } from '@/lib/auth/permissions'
import { resolveLinkedPlayerIdentity, signPlayerAvatarRecords } from '@/lib/players/avatar.server'
import { LineupGrid } from '@/components/matches/LineupGrid'
import { MatchScoreHero } from '@/components/matches/MatchScoreHero'
import { GameDateTime } from '@/components/matches/GameDateTime'
import { ResetTeamsButton } from '@/components/matches/ResetTeamsButton'
import { DeleteGameButton } from '@/components/matches/DeleteGameButton'
import { MatchComments, type MatchComment } from '@/components/matches/MatchComments'
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

type MatchLineupPlayer = PlayerPublic & {
  avatar_url: string | null
  is_captain: boolean
}

type MentionableUser = {
  id: string
  display_name: string
}

type MatchCommentRow = {
  id: string
  author_id: string
  content: string
  mention_user_ids: string[]
  created_at: string
  profiles: { display_name: string } | null
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
  const isAdmin = session ? canAccessAdmin(session.roles) : false
  const isApproved = session?.profile?.approved ?? false

  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('id', id)
    .single() as { data: Game | null; error: unknown }

  if (!game) notFound()

  const { data: gamePlayers } = await supabase
    .from('game_players')
    .select('player_id, team, is_captain')
    .eq('game_id', id) as { data: Pick<GamePlayer, 'player_id' | 'team' | 'is_captain'>[] | null; error: unknown }

  const playerIds = (gamePlayers ?? []).map((gp) => gp.player_id)
  const hasTeamDefinitions = (gamePlayers ?? []).some((gp) => gp.team != null || gp.is_captain)
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
    .map((gp) => {
      const player = playerMap.get(gp.player_id)
      return player ? { ...player, is_captain: gp.is_captain } : null
    })
    .filter((p): p is MatchLineupPlayer => p != null)

  const teamB = gpList
    .filter((gp) => gp.team === 'b')
    .map((gp) => {
      const player = playerMap.get(gp.player_id)
      return player ? { ...player, is_captain: gp.is_captain } : null
    })
    .filter((p): p is MatchLineupPlayer => p != null)

  const unassigned = gpList
    .filter((gp) => !gp.team)
    .map((gp) => {
      const player = playerMap.get(gp.player_id)
      return player ? { ...player, is_captain: gp.is_captain } : null
    })
    .filter((p): p is MatchLineupPlayer => p != null)

  let comments: MatchComment[] = []
  let mentionableUsers: MentionableUser[] = []
  const currentUserLinkedPlayer = session
    ? await resolveLinkedPlayerIdentity(session.userId, isApproved)
    : null

  if (session) {
    const [{ data: commentRows }, { data: profileRows }] = await Promise.all([
      supabase
        .from('match_comments')
        .select('id, author_id, content, mention_user_ids, created_at, profiles:author_id(display_name)')
        .eq('game_id', id)
        .order('created_at', { ascending: true }) as unknown as PromiseLike<{
          data: MatchCommentRow[] | null
          error: unknown
        }>,
      supabase
        .from('profiles')
        .select('id, display_name')
        .order('display_name', { ascending: true }) as unknown as PromiseLike<{
          data: MentionableUser[] | null
          error: unknown
        }>,
    ])

    const authorIds = [...new Set((commentRows ?? []).map((comment) => comment.author_id))]
    const authorAvatarByProfile = new Map<string, string | null>()

    if (isApproved && authorIds.length > 0) {
      const { data: authorPlayers } = await supabase
        .from('players')
        .select('profile_id, avatar_path')
        .in('profile_id', authorIds) as {
          data: Array<{ profile_id: string | null; avatar_path: string | null }> | null
          error: unknown
        }
      const signedAuthorPlayers = await signPlayerAvatarRecords(authorPlayers ?? [], true)
      for (const player of signedAuthorPlayers) {
        if (player.profile_id) {
          authorAvatarByProfile.set(player.profile_id, player.avatar_url)
        }
      }
    }

    comments = (commentRows ?? []).map((comment) => ({
      id: comment.id,
      author_id: comment.author_id,
      author_name: comment.profiles?.display_name ?? 'Utilizador',
      author_avatar_url: authorAvatarByProfile.get(comment.author_id) ?? null,
      content: comment.content,
      mention_user_ids: comment.mention_user_ids,
      created_at: comment.created_at,
    }))
    mentionableUsers = profileRows ?? []
  }

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
          {game.status === 'scheduled' && hasTeamDefinitions && (
            <ResetTeamsButton gameId={id} playerIds={playerIds} />
          )}
          {isAdmin && game.status === 'scheduled' && (
            <DeleteGameButton gameId={id} />
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

      <MatchComments
        gameId={id}
        comments={comments}
        mentionableUsers={mentionableUsers}
        currentUser={
          session
            ? {
                id: session.userId,
                display_name: session.profile.display_name,
                avatar_url: currentUserLinkedPlayer?.avatar_url ?? null,
              }
            : null
        }
      />
    </div>
  )
}
