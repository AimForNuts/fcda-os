'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronDown, ChevronRight, ChevronUp, ExternalLink, MessageCircle, Trophy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n/config'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { NationalityFlag } from '@/components/player/NationalityFlag'
import { GameStatusBadge } from '@/components/matches/GameStatusBadge'
import { GameTypeBadge } from '@/components/matches/GameTypeBadge'
import { WeatherSummary } from '@/components/matches/WeatherSummary'
import { TeamHeader } from '@/components/matches/TeamHeader'
import { GAME_TIME_ZONE } from '@/lib/games/format-schedule-date'
import { getTeamPresentation } from '@/lib/games/team-presentation'
import { bcp47ForI18nLanguage } from '@/lib/i18n/date-locale'
import { getRecintoMapsUrl } from '@/lib/recintos/google-maps'
import { cn } from '@/lib/utils'
import type { MatchWeather } from '@/lib/weather/open-meteo'
import type { Game, Recinto } from '@/types'

type LineupSummaryPlayer = {
  id: string
  name: string
  avatar_url: string | null
  shirt_number: number | null
  nationality: string
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

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase()
}

type Props = {
  game: Game
  lineup?: LineupSummary
  showAvatars?: boolean
  commentCount?: number
  recinto?: Pick<Recinto, 'name' | 'google_place_id' | 'latitude' | 'longitude' | 'maps_url'> | null
  weather?: MatchWeather | null
}

function PlayerSummaryRow({
  player,
  showAvatars,
  muted = false,
  captainAbbrev,
}: {
  player: LineupSummaryPlayer
  showAvatars: boolean
  muted?: boolean
  captainAbbrev: string
}) {
  const displayName = toTitleCase(player.name)

  return (
    <div
      className={cn(
        'group grid min-h-9 items-center gap-2 rounded-md px-2 py-1.5 text-[1.05rem] leading-tight transition-colors hover:bg-fcda-ice/35 sm:text-lg',
        showAvatars
          ? 'grid-cols-[2.25rem_1.75rem_2rem_minmax(0,1fr)]'
          : 'grid-cols-[2.25rem_2rem_minmax(0,1fr)]',
        muted && 'text-muted-foreground',
      )}
    >
      <span className="text-right font-medium tabular-nums text-muted-foreground">
        {player.shirt_number ?? '–'}
      </span>
      {showAvatars ? (
        <Avatar size="sm" className="size-7">
          {player.avatar_url ? <AvatarImage src={player.avatar_url} alt="" aria-hidden /> : null}
          <AvatarFallback className="bg-muted text-[0.65rem] font-semibold text-muted-foreground">
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
      ) : null}
      <NationalityFlag nationality={player.nationality} className="h-4 w-6" />
      <span className="flex min-w-0 items-baseline gap-1.5 font-normal text-foreground">
        <span className="min-w-0 truncate group-hover:underline">{displayName}</span>
        {player.is_captain ? (
          <span className="shrink-0 text-current">{captainAbbrev}</span>
        ) : null}
      </span>
    </div>
  )
}

export function MatchCard({ game, lineup, showAvatars = false, commentCount = 0, recinto, weather }: Props) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(
    game.status === 'finished' || game.status === 'cancelled'
  )
  const mapsUrl = getRecintoMapsUrl(recinto)

  const dateLocale = bcp47ForI18nLanguage(i18n.language)
  const captainAbbrev = t('matches.captainAbbrev')

  const d = new Date(game.date)
  const fullDateStr = d.toLocaleDateString(dateLocale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: GAME_TIME_ZONE,
  })
  const dayStr = d.toLocaleDateString(dateLocale, { day: '2-digit', timeZone: GAME_TIME_ZONE })
  const monthStr = d.toLocaleDateString(dateLocale, { month: 'short', timeZone: GAME_TIME_ZONE }).replace('.', '')
  const weekdayStr = d.toLocaleDateString(dateLocale, { weekday: 'short', timeZone: GAME_TIME_ZONE }).replace('.', '')
  const timeStr = d.toLocaleTimeString(dateLocale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: GAME_TIME_ZONE,
  })
  const scoreStr = game.status === 'finished' && game.score_a != null && game.score_b != null
    ? `${game.score_a} – ${game.score_b}`
    : null
  const winningTeam = game.status === 'finished' && game.score_a != null && game.score_b != null
    ? game.score_a > game.score_b
      ? 'a'
      : game.score_b > game.score_a
        ? 'b'
        : null
    : null

  const hasTeams = lineup && (lineup.teamA.length > 0 || lineup.teamB.length > 0)
  const hasUnassigned = lineup && lineup.unassigned.length > 0 && !hasTeams
  const hasPlayers = hasTeams || hasUnassigned

  const kitA = getTeamPresentation('a')
  const kitB = getTeamPresentation('b')

  return (
    <Link href={`/matches/${game.id}`} className="block" aria-label={`${game.location} — ${fullDateStr}`}>
      <Card className="cursor-pointer rounded-lg border-0 py-0 shadow-none ring-1 ring-border transition-colors hover:bg-muted/30 lg:rounded-none lg:ring-0 lg:ring-inset lg:hover:bg-muted/20">
        <CardContent className="px-0 py-0">
          <div className="grid min-h-32 gap-4 p-4 sm:gap-5 sm:p-5 lg:grid-cols-[minmax(8rem,14rem)_1fr_minmax(10rem,14rem)] lg:items-center lg:gap-6 lg:border-b lg:border-border">
            <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-4 lg:flex lg:items-center lg:justify-start">
              <div className="rounded-lg bg-muted/40 px-3 py-2 text-center lg:bg-transparent lg:px-0 lg:py-0 lg:text-left">
                <p className="text-xs font-black uppercase text-muted-foreground">{monthStr}</p>
                <p className="mt-0.5 text-3xl font-black leading-none text-primary tabular-nums sm:text-4xl">
                  {dayStr}
                </p>
                <p className="mt-1 text-xs font-bold uppercase text-muted-foreground">{weekdayStr}</p>
              </div>
              <div className="min-w-0 text-left">
                <div className="flex min-w-0 items-center gap-2 lg:block">
                  <p className="shrink-0 text-sm font-bold text-foreground">{timeStr}</p>
                  <WeatherSummary weather={weather} className="max-w-full lg:mt-2" />
                </div>
                {mapsUrl ? (
                  <button
                    type="button"
                    className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-sm text-muted-foreground hover:text-foreground hover:underline"
                    aria-label={`Abrir ${game.location} no Google Maps`}
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      window.open(mapsUrl, '_blank', 'noopener,noreferrer')
                    }}
                  >
                    <span className="truncate">{game.location}</span>
                    <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                  </button>
                ) : (
                  <p className="mt-1 truncate text-sm text-muted-foreground">{game.location}</p>
                )}
              </div>
            </div>

            <div className="min-w-0">
              <div className="grid grid-cols-[minmax(4rem,1fr)_auto_minmax(4rem,1fr)] items-center gap-3 sm:gap-6">
                <div className="flex min-w-0 items-center justify-end gap-2 text-right">
                  <span
                    className={cn(
                      'hidden min-w-0 truncate text-sm font-semibold text-foreground sm:inline sm:text-base',
                      winningTeam === 'a' && 'font-black',
                    )}
                  >
                    {t('matches.teamA')}
                  </span>
                  {winningTeam === 'a' ? (
                    <Trophy className="size-4 shrink-0 text-fcda-gold sm:size-5" aria-hidden />
                  ) : null}
                  <Image
                    src={kitA.imageSrc}
                    alt=""
                    width={44}
                    height={61}
                    className="h-14 w-auto shrink-0 object-contain sm:h-14"
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
                      {t('matches.noGamePlayed')}
                    </span>
                  ) : (
                    <span className="text-3xl font-black leading-none text-foreground tabular-nums sm:text-4xl">
                      {timeStr}
                    </span>
                  )}
                </div>

                <div className="flex min-w-0 items-center gap-2">
                  <Image
                    src={kitB.imageSrc}
                    alt=""
                    width={44}
                    height={61}
                    className="h-14 w-auto shrink-0 object-contain sm:h-14"
                    aria-hidden
                  />
                  {winningTeam === 'b' ? (
                    <Trophy className="size-4 shrink-0 text-fcda-gold sm:size-5" aria-hidden />
                  ) : null}
                  <span
                    className={cn(
                      'hidden min-w-0 truncate text-sm font-semibold text-foreground sm:inline sm:text-base',
                      winningTeam === 'b' && 'font-black',
                    )}
                  >
                    {t('matches.teamB')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex min-w-0 items-center justify-between gap-3 border-t border-border pt-3 lg:justify-end lg:border-t-0 lg:pt-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
                <GameStatusBadge status={game.status} />
                <GameTypeBadge competitive={game.counts_for_stats} compact />
                <span
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground"
                  aria-label={t('matches.commentsAria', { count: commentCount })}
                  title={t('matches.commentsAria', { count: commentCount })}
                >
                  <MessageCircle size={15} aria-hidden />
                  <span className="tabular-nums">{commentCount}</span>
                </span>
                <span className="ml-auto inline-flex items-center gap-1 text-sm font-bold text-primary lg:ml-0">
                  {t('matches.viewGame')}
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
                <TeamHeader team="a" variant="plain" className="[&_h3]:hidden sm:[&_h3]:block" />
                <div className="space-y-1">
                  {lineup!.teamA.map((player) => (
                    <PlayerSummaryRow
                      key={player.id}
                      player={player}
                      showAvatars={showAvatars}
                      captainAbbrev={captainAbbrev}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <TeamHeader team="b" variant="plain" className="[&_h3]:hidden sm:[&_h3]:block" />
                <div className="space-y-1">
                  {lineup!.teamB.map((player) => (
                    <PlayerSummaryRow
                      key={player.id}
                      player={player}
                      showAvatars={showAvatars}
                      captainAbbrev={captainAbbrev}
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
                  captainAbbrev={captainAbbrev}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
