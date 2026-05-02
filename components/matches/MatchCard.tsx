'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronDown, ChevronRight, ChevronUp, MessageCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PlayerIdentity } from '@/components/player/PlayerIdentity'
import { TeamHeader } from '@/components/matches/TeamHeader'
import { useTranslation } from 'react-i18next'
import { GAME_TIME_ZONE } from '@/lib/games/format-schedule-date'
import { getTeamPresentation } from '@/lib/games/team-presentation'
import type { Game } from '@/types'

type LineupSummaryPlayer = {
  id: string
  name: string
  avatar_url: string | null
  shirt_number: number | null
  is_captain: boolean
}

export type LineupSummary = {
  teamA: LineupSummaryPlayer[]
  teamB: LineupSummaryPlayer[]
  unassigned: LineupSummaryPlayer[]
}

function toTitleCase(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

type Props = {
  game: Game
  lineup?: LineupSummary
  showAvatars?: boolean
  commentCount?: number
}

function PlayerSummaryRow({
  player,
  showAvatars,
  muted = false,
}: {
  player: LineupSummaryPlayer
  showAvatars: boolean
  muted?: boolean
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <PlayerIdentity
        name={toTitleCase(player.name)}
        shirtNumber={player.shirt_number}
        avatarUrl={player.avatar_url}
        showAvatar={showAvatars}
        avatarSize="sm"
        className={muted ? 'min-w-0 flex-1 text-xs text-muted-foreground' : 'min-w-0 flex-1 text-xs'}
        nameClassName="text-xs"
      />
      {player.is_captain && (
        <span className="shrink-0 rounded bg-fcda-gold/40 px-1.5 py-0.5 text-[10px] font-bold uppercase text-fcda-navy">
          C
        </span>
      )}
    </div>
  )
}

export function MatchCard({ game, lineup, showAvatars = false, commentCount = 0 }: Props) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(
    game.status === 'finished' || game.status === 'cancelled'
  )

  const d = new Date(game.date)
  const fullDateStr = d.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: GAME_TIME_ZONE,
  })
  const dayStr = d.toLocaleDateString('pt-PT', { day: '2-digit', timeZone: GAME_TIME_ZONE })
  const monthStr = d.toLocaleDateString('pt-PT', { month: 'short', timeZone: GAME_TIME_ZONE }).replace('.', '')
  const weekdayStr = d.toLocaleDateString('pt-PT', { weekday: 'short', timeZone: GAME_TIME_ZONE }).replace('.', '')
  const timeStr = d.toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: GAME_TIME_ZONE,
  })
  const scoreStr = game.status === 'finished' && game.score_a != null && game.score_b != null
    ? `${game.score_a} – ${game.score_b}`
    : null

  const hasTeams = lineup && (lineup.teamA.length > 0 || lineup.teamB.length > 0)
  const hasUnassigned = lineup && lineup.unassigned.length > 0 && !hasTeams
  const hasPlayers = hasTeams || hasUnassigned

  const kitA = getTeamPresentation('a')
  const kitB = getTeamPresentation('b')

  return (
    <Link href={`/matches/${game.id}`} className="block" aria-label={`${game.location} — ${fullDateStr}`}>
      <Card className="cursor-pointer rounded-lg border-0 bg-white py-0 shadow-none ring-1 ring-border transition-colors hover:bg-muted/30 lg:rounded-none lg:ring-0 lg:ring-inset lg:hover:bg-muted/20">
        <CardContent className="px-0 py-0">
          <div className="grid min-h-32 gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(8rem,14rem)_1fr_minmax(10rem,14rem)] lg:items-center lg:gap-6 lg:border-b lg:border-border">
            <div className="flex items-center justify-between gap-4 lg:justify-start">
              <div>
                <p className="text-xs font-black uppercase text-muted-foreground">{monthStr}</p>
                <p className="mt-0.5 text-4xl font-black leading-none text-fcda-blue tabular-nums">
                  {dayStr}
                </p>
                <p className="mt-1 text-xs font-bold uppercase text-muted-foreground">{weekdayStr}</p>
              </div>
              <div className="min-w-0 text-right lg:text-left">
                <p className="truncate text-sm font-bold text-foreground">{timeStr}</p>
                <p className="mt-1 truncate text-sm text-muted-foreground">{game.location}</p>
              </div>
            </div>

            <div className="min-w-0">
              <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-6">
                <div className="flex min-w-0 items-center justify-end gap-3 text-right">
                  <span className="truncate text-sm font-black text-foreground sm:text-base">
                    Equipa Branca
                  </span>
                  <Image
                    src={kitA.imageSrc}
                    alt=""
                    width={44}
                    height={61}
                    className="h-12 w-auto shrink-0 object-contain sm:h-14"
                    aria-hidden
                  />
                </div>

                <div className="flex min-w-[5.25rem] justify-center">
                  {scoreStr ? (
                    <span className="text-3xl font-black leading-none text-foreground tabular-nums sm:text-4xl">
                      {scoreStr}
                    </span>
                  ) : game.status === 'cancelled' ? (
                    <span className="rounded-full bg-destructive/10 px-3 py-1.5 text-xs font-black uppercase text-destructive">
                      Sem jogo
                    </span>
                  ) : (
                    <span className="text-3xl font-black leading-none text-foreground tabular-nums sm:text-4xl">
                      {timeStr}
                    </span>
                  )}
                </div>

                <div className="flex min-w-0 items-center gap-3">
                  <Image
                    src={kitB.imageSrc}
                    alt=""
                    width={44}
                    height={61}
                    className="h-12 w-auto shrink-0 object-contain sm:h-14"
                    aria-hidden
                  />
                  <span className="truncate text-sm font-black text-foreground sm:text-base">
                    Equipa Azul
                  </span>
                </div>
              </div>
            </div>

            <div className="flex min-w-0 items-center justify-between gap-3 border-t border-border pt-4 lg:justify-end lg:border-t-0 lg:pt-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
                <Badge
                  variant={
                    game.status === 'finished'
                      ? 'default'
                      : game.status === 'cancelled'
                        ? 'destructive'
                        : 'secondary'
                  }
                >
                  {t(`matches.status.${game.status}`)}
                </Badge>
                <span
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground"
                  aria-label={`${commentCount} comentários`}
                  title={`${commentCount} comentários`}
                >
                  <MessageCircle size={15} aria-hidden />
                  <span className="tabular-nums">{commentCount}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-sm font-bold text-fcda-blue">
                  Ver jogo
                  <ChevronRight className="size-4" aria-hidden />
                </span>
              </div>
              {hasPlayers && (
                <button
                  type="button"
                  aria-label="toggle players"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setCollapsed((c) => !c)
                  }}
                  className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                </button>
              )}
            </div>
          </div>

          {!collapsed && hasTeams && (
            <div className="grid gap-4 border-b border-border bg-muted/20 p-4 sm:grid-cols-2 sm:p-5">
              <div className="space-y-2">
                <TeamHeader team="a" />
                <div className="space-y-1">
                  {lineup!.teamA.map((player) => (
                    <PlayerSummaryRow
                      key={player.id}
                      player={player}
                      showAvatars={showAvatars}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <TeamHeader team="b" />
                <div className="space-y-1">
                  {lineup!.teamB.map((player) => (
                    <PlayerSummaryRow
                      key={player.id}
                      player={player}
                      showAvatars={showAvatars}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {!collapsed && hasUnassigned && (
            <div className="space-y-1 border-b border-border bg-muted/20 p-4 sm:p-5">
              {lineup!.unassigned.map((player) => (
                <PlayerSummaryRow
                  key={player.id}
                  player={player}
                  showAvatars={showAvatars}
                  muted
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
