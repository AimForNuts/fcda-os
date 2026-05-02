import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  CalendarClock,
  Flag,
  MapPin,
  MessageCircle,
  Pencil,
  Star,
  Trophy,
  UserRoundPlus,
  UsersRound,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { fetchSessionContext, canAccessAdmin, canAccessMod } from '@/lib/auth/permissions'
import { resolveLinkedPlayerIdentity, signPlayerAvatarRecords } from '@/lib/players/avatar.server'
import { LineupGrid } from '@/components/matches/LineupGrid'
import { GameDateTime } from '@/components/matches/GameDateTime'
import { ResetTeamsButton } from '@/components/matches/ResetTeamsButton'
import { DeleteGameButton } from '@/components/matches/DeleteGameButton'
import { MatchComments, type MatchComment } from '@/components/matches/MatchComments'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GAME_TIME_ZONE } from '@/lib/games/format-schedule-date'
import { getTeamPresentation } from '@/lib/games/team-presentation'
import { cn } from '@/lib/utils'
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

const STATUS_BADGE_CLASS: Record<Game['status'], string> = {
  scheduled: 'border-white/20 bg-white/14 text-white',
  finished: 'border-emerald-300/35 bg-emerald-400/18 text-emerald-50',
  cancelled: 'border-red-300/40 bg-red-500/16 text-red-50',
}

const MANAGEMENT_ACTION_CLASS = 'h-10 w-full justify-start rounded-lg px-3 text-sm font-semibold'

function formatMatchDateParts(iso: string) {
  const date = new Date(iso)
  const weekday = date
    .toLocaleDateString('pt-PT', {
      weekday: 'long',
      timeZone: GAME_TIME_ZONE,
    })
  const longDate = date
    .toLocaleDateString('pt-PT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: GAME_TIME_ZONE,
    })
  const shortDate = date
    .toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: GAME_TIME_ZONE,
    })
    .replace('.', '')
  const time = date.toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: GAME_TIME_ZONE,
  })

  return {
    headline: `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${longDate}`,
    shortDate,
    time,
  }
}

function getCenterLabel(game: Game, time: string) {
  if (game.status === 'cancelled') return 'Sem jogo'
  if (game.status === 'finished' && game.score_a != null && game.score_b != null) {
    return `${game.score_a} - ${game.score_b}`
  }
  return time
}

function MatchDetailHero({
  game,
  showRateButton,
}: {
  game: Game
  showRateButton: boolean
}) {
  const formatted = formatMatchDateParts(game.date)
  const teamA = getTeamPresentation('a')
  const teamB = getTeamPresentation('b')
  const centerLabel = getCenterLabel(game, formatted.time)

  return (
    <section className="relative isolate overflow-hidden bg-fcda-navy text-white">
      <div
        className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(0,32,116,0.98)_0%,rgba(0,65,190,0.82)_52%,rgba(0,94,230,0.52)_100%)]"
        aria-hidden
      />
      <div
        className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(0,0,0,0.18),transparent_56%)]"
        aria-hidden
      />

      <div className="container mx-auto max-w-screen-xl px-4 py-5 sm:py-6">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
          <Link
            href="/matches"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white/72 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Jogos
          </Link>
          <Badge
            variant="outline"
            className={cn('h-7 border px-3 text-sm font-bold backdrop-blur-sm', STATUS_BADGE_CLASS[game.status])}
          >
            {STATUS_LABEL[game.status]}
          </Badge>
        </div>

        <div className="grid gap-6 pt-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-center lg:gap-10">
          <div className="min-w-0">
            <h1 className="sr-only">{formatted.headline}</h1>

            <div className="grid max-w-3xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-5">
              <div className="flex min-w-0 items-center justify-end gap-3 text-right">
                <span className="truncate text-sm font-black text-white sm:text-base">
                  {teamA.label}
                </span>
                <Image
                  src={teamA.imageSrc}
                  alt={teamA.imageAlt}
                  width={72}
                  height={99}
                  priority
                  className="h-12 w-auto shrink-0 object-contain drop-shadow-lg sm:h-16"
                />
              </div>

              <div className="flex min-w-[5.75rem] justify-center sm:min-w-[7.5rem]">
                <span
                  className={cn(
                    'text-center text-4xl font-black leading-none text-white tabular-nums sm:text-5xl lg:text-6xl',
                    game.status === 'cancelled' && 'max-w-32 text-2xl uppercase sm:text-3xl lg:text-4xl',
                  )}
                >
                  {centerLabel}
                </span>
              </div>

              <div className="flex min-w-0 items-center gap-3">
                <Image
                  src={teamB.imageSrc}
                  alt={teamB.imageAlt}
                  width={72}
                  height={99}
                  priority
                  className="h-12 w-auto shrink-0 object-contain drop-shadow-lg sm:h-16"
                />
                <span className="truncate text-sm font-black text-white sm:text-base">
                  {teamB.label}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 text-sm text-white/92">
            <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-3 border-b border-white/12 pb-3">
              <CalendarClock className="mt-0.5 size-5 text-white/45" aria-hidden />
              <div className="min-w-0">
                <p className="font-semibold">{formatted.shortDate} às {formatted.time}</p>
                <p className="mt-1 text-white/48">Hora local</p>
              </div>
            </div>
            <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-3 border-b border-white/12 pb-3">
              <MapPin className="mt-0.5 size-5 text-white/45" aria-hidden />
              <div className="min-w-0">
                <p className="truncate font-semibold">{game.location}</p>
                <p className="mt-1 text-white/48">Recinto</p>
              </div>
            </div>
            {showRateButton && (
              <Button
                className="mt-2 h-10 bg-fcda-gold font-black text-fcda-navy hover:bg-fcda-gold/90"
                nativeButton={false}
                render={<Link href={`/matches/${game.id}/rate`} />}
              >
                <Star className="size-4" aria-hidden />
                Avaliar colegas
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
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
      .select('id, display_name, shirt_number, nationality, current_rating, profile_id, avatar_path, description')
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
    <div className="bg-white">
      <MatchDetailHero
        game={game}
        showRateButton={showRateButton}
      />

      <main className="container mx-auto max-w-screen-xl px-4 py-8 md:py-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="min-w-0 space-y-10">
            <section>
              <div className="mb-5 border-b border-border pb-4">
                <p className="text-sm font-bold uppercase text-fcda-blue">Convocatória</p>
                <div className="mt-1 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                    Equipas e jogadores
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {players.length} {players.length === 1 ? 'jogador' : 'jogadores'}
                  </p>
                </div>
              </div>
              <LineupGrid teamA={teamA} teamB={teamB} unassigned={unassigned} isApproved={isApproved} />
            </section>

            <section>
              <div className="mb-5 border-b border-border pb-4">
                <p className="text-sm font-bold uppercase text-fcda-blue">Conversa</p>
                <div className="mt-1 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                    Comentários
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {comments.length} {comments.length === 1 ? 'comentário' : 'comentários'}
                  </p>
                </div>
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
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24">
            <section className="border-y border-border py-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-sm font-black uppercase text-muted-foreground">
                  Resumo
                </h2>
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

              <dl className="space-y-4 text-sm">
                <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-3">
                  <CalendarClock className="mt-0.5 size-5 text-muted-foreground" aria-hidden />
                  <div className="min-w-0">
                    <dt className="text-muted-foreground">Data</dt>
                    <dd className="mt-1 font-semibold">
                      <GameDateTime iso={game.date} />
                    </dd>
                  </div>
                </div>
                <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-3">
                  <MapPin className="mt-0.5 size-5 text-muted-foreground" aria-hidden />
                  <div className="min-w-0">
                    <dt className="text-muted-foreground">Recinto</dt>
                    <dd className="mt-1 truncate font-semibold">{game.location}</dd>
                  </div>
                </div>
                <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-3">
                  <Flag className="mt-0.5 size-5 text-muted-foreground" aria-hidden />
                  <div className="min-w-0">
                    <dt className="text-muted-foreground">Estado</dt>
                    <dd className="mt-1 font-semibold">{STATUS_LABEL[game.status]}</dd>
                  </div>
                </div>
                <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-3">
                  <UsersRound className="mt-0.5 size-5 text-muted-foreground" aria-hidden />
                  <div className="min-w-0">
                    <dt className="text-muted-foreground">Convocados</dt>
                    <dd className="mt-1 font-semibold tabular-nums">{players.length}</dd>
                  </div>
                </div>
                <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-3">
                  <MessageCircle className="mt-0.5 size-5 text-muted-foreground" aria-hidden />
                  <div className="min-w-0">
                    <dt className="text-muted-foreground">Comentários</dt>
                    <dd className="mt-1 font-semibold tabular-nums">{comments.length}</dd>
                  </div>
                </div>
              </dl>
            </section>

            {isMod && (
              <section className="border-y border-border py-5">
                <h2 className="mb-4 text-sm font-black uppercase text-muted-foreground">
                  Gestão
                </h2>
                <div className="grid gap-2">
                  <Button
                    size="lg"
                    variant="outline"
                    className={MANAGEMENT_ACTION_CLASS}
                    nativeButton={false}
                    render={<Link href={`/mod/games/${id}/edit`} />}
                  >
                    <Pencil className="size-4" aria-hidden />
                    Editar jogo
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className={MANAGEMENT_ACTION_CLASS}
                    nativeButton={false}
                    render={<Link href={`/mod/games/${id}/lineup`} />}
                  >
                    <UserRoundPlus className="size-4" aria-hidden />
                    Gerir convocados
                  </Button>
                  {game.status === 'scheduled' && (
                    <Button
                      size="lg"
                      className={cn(MANAGEMENT_ACTION_CLASS, 'bg-fcda-gold text-fcda-navy hover:bg-fcda-gold/90')}
                      nativeButton={false}
                      render={<Link href={`/mod/games/${id}/finish`} />}
                    >
                      <Trophy className="size-4" aria-hidden />
                      Terminar jogo
                    </Button>
                  )}
                  {game.status === 'scheduled' && hasTeamDefinitions && (
                    <ResetTeamsButton
                      gameId={id}
                      playerIds={playerIds}
                      className="w-full"
                      size="lg"
                      buttonClassName={MANAGEMENT_ACTION_CLASS}
                    />
                  )}
                  {isAdmin && game.status === 'scheduled' && (
                    <DeleteGameButton
                      gameId={id}
                      className="w-full"
                      size="lg"
                      buttonClassName={MANAGEMENT_ACTION_CLASS}
                    />
                  )}
                </div>
              </section>
            )}
          </aside>
        </div>
      </main>
    </div>
  )
}
