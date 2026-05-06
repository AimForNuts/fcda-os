'use client'

import { useState, useMemo, useDeferredValue } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { Crown, Search } from 'lucide-react'
import { NationalityFlag } from '@/components/player/NationalityFlag'
import { PlayerIdentity } from '@/components/player/PlayerIdentity'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  buildLeaderboardRows,
  compareLeaderboardRows,
  filterLeaderboardRows,
  type LeaderboardFormByPlayerId,
  type LeaderboardFormResult,
  type LeaderboardMode,
  type LeaderboardPlayer,
  type LeaderboardRow,
} from '@/lib/stats/leaderboard'
import { cn } from '@/lib/utils'

type Props = {
  players: LeaderboardPlayer[]
  formByPlayerId?: LeaderboardFormByPlayerId
  isAnonymised: boolean
  highlightedPlayerId?: string | null
  /** When set, `/stats` can offer a switch to rank by all finished games including friendlies */
  friendlyRankingToggle?: boolean
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

function formatDecimal(value: number) {
  return value.toLocaleString('pt-PT', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) {
    return '?'
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  }

  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase()
}

function getPodiumAccentClassName(standing: number) {
  switch (standing) {
    case 1:
      return 'bg-fcda-gold text-fcda-navy'
    case 2:
      return 'bg-sky-500 text-white'
    case 3:
      return 'bg-rose-500 text-white'
    default:
      return 'bg-fcda-navy text-white'
  }
}

function getPodiumRingClassName(standing: number) {
  switch (standing) {
    case 1:
      return 'ring-fcda-gold/25'
    case 2:
      return 'ring-sky-500/20'
    case 3:
      return 'ring-rose-500/20'
    default:
      return 'ring-border'
  }
}

function getPodiumPlacementClassName(index: number) {
  switch (index) {
    case 0:
      return 'order-2'
    case 1:
      return 'order-1'
    case 2:
      return 'order-3'
    default:
      return ''
  }
}

function getPodiumAvatarClassName(index: number) {
  return index === 0
    ? 'size-20 sm:size-32 md:size-28 lg:size-32'
    : 'size-[4.5rem] sm:size-28 md:size-24 lg:size-28'
}

function getPodiumBarClassName(standing: number) {
  switch (standing) {
    case 1:
      return 'h-3 max-w-48'
    case 2:
      return 'h-2.5 max-w-44'
    case 3:
      return 'h-2 max-w-44'
    default:
      return 'h-2 max-w-40'
  }
}

function getRankBadgeClassName(standing: number, isBottomThree: boolean) {
  switch (standing) {
    case 1:
      return 'bg-fcda-gold text-fcda-navy'
    case 2:
      return 'bg-sky-500 text-white'
    case 3:
      return 'bg-rose-500 text-white'
    default:
      return isBottomThree
        ? 'bg-slate-400 text-white'
        : 'border border-fcda-navy/15 bg-white text-fcda-navy'
  }
}

function pointsSortComparator(a: LeaderboardRow, b: LeaderboardRow) {
  if (a.points !== b.points) return a.points - b.points
  if (a.wins !== b.wins) return a.wins - b.wins
  return a.total - b.total
}

function getFormResultClassName(result: LeaderboardFormResult) {
  switch (result) {
    case 'win':
      return 'bg-emerald-600 text-white'
    case 'draw':
      return 'bg-slate-500 text-white'
    case 'loss':
      return 'bg-red-600 text-white'
  }
}

function getFormResultLabel(
  result: LeaderboardFormResult,
  t: ReturnType<typeof useTranslation>['t'],
) {
  switch (result) {
    case 'win':
      return t('stats.formWin')
    case 'draw':
      return t('stats.formDraw')
    case 'loss':
      return t('stats.formLoss')
  }
}

function getFormResultShortLabel(
  result: LeaderboardFormResult,
  t: ReturnType<typeof useTranslation>['t'],
) {
  switch (result) {
    case 'win':
      return t('stats.formWinShort')
    case 'draw':
      return t('stats.formDrawShort')
    case 'loss':
      return t('stats.formLossShort')
  }
}

function FormPills({
  form,
  className,
}: {
  form: LeaderboardFormResult[]
  className?: string
}) {
  const { t } = useTranslation()

  if (form.length === 0) {
    return (
      <span className={cn('text-xs text-muted-foreground', className)}>
        {t('stats.noForm')}
      </span>
    )
  }

  const label = `${t('stats.colForm')}: ${form
    .map((result) => getFormResultLabel(result, t))
    .join(', ')}`

  return (
    <span className={cn('inline-flex items-center gap-1', className)} aria-label={label}>
      {form.map((result, index) => (
        <span
          key={`${result}-${index}`}
          aria-hidden
          className={cn(
            'inline-flex h-5 w-5 items-center justify-center rounded-full text-[0.65rem] font-black leading-none',
            getFormResultClassName(result)
          )}
        >
          {getFormResultShortLabel(result, t)}
        </span>
      ))}
    </span>
  )
}

function LeaderCard({
  player,
  index,
  isAnonymised,
}: {
  player: LeaderboardRow
  index: number
  isAnonymised: boolean
}) {
  const { t } = useTranslation()
  const nameNode = !isAnonymised ? (
    <Link href={`/players/${player.id}`} className="min-w-0 truncate font-black text-fcda-navy hover:underline">
      {player.display_name}
    </Link>
  ) : (
    <span className="min-w-0 truncate font-black text-fcda-navy">{player.display_name}</span>
  )

  return (
    <article
      className={cn(
        'relative flex min-h-40 min-w-0 flex-col items-center justify-end text-center sm:min-h-64 md:grid md:min-h-44 md:w-full md:max-w-72 md:grid-cols-[auto_minmax(0,1fr)] md:grid-rows-[1fr_auto] md:items-end md:justify-self-center md:gap-x-4 lg:max-w-80',
        getPodiumPlacementClassName(index)
      )}
    >
      <div className="relative flex flex-col items-center md:self-end">
        {index === 0 ? (
          <Crown
            className="absolute -top-5 left-1/2 z-10 size-6 -translate-x-1/2 fill-fcda-gold text-fcda-gold drop-shadow-sm sm:-top-7 sm:size-8 md:-top-6 md:size-7 lg:-top-7 lg:size-8"
            aria-hidden
          />
        ) : null}
        <Avatar
          className={cn(
            'border-[3px] border-white bg-muted shadow-xl shadow-fcda-navy/10 ring-4 sm:border-4 sm:ring-8',
            getPodiumAvatarClassName(index),
            getPodiumRingClassName(player.standing)
          )}
        >
          {!isAnonymised && player.avatar_url ? (
            <AvatarImage src={player.avatar_url} alt={player.display_name} />
          ) : null}
          <AvatarFallback className="bg-fcda-navy text-xl font-black text-white">
            {getInitials(player.display_name)}
          </AvatarFallback>
        </Avatar>
        <span
          className={cn(
            'absolute -right-3 bottom-1 flex size-7 items-center justify-center rounded-full border-[3px] border-white text-[0.6rem] font-black tabular-nums shadow-lg sm:-right-5 sm:bottom-2 sm:size-9 sm:border-4 sm:text-xs md:-right-6 md:size-10 md:text-sm',
            getPodiumAccentClassName(player.standing)
          )}
          aria-label={`${t('stats.colRank')} ${player.standing}`}
        >
          #{player.standing}
        </span>
      </div>
      <div className="mt-2 flex w-full min-w-0 flex-col items-center gap-1 px-0.5 sm:mt-3 sm:gap-1.5 sm:px-2 md:self-end md:px-0 md:pb-2">
        <div className="flex max-w-full min-w-0 items-center justify-center gap-1 text-[0.68rem] sm:gap-1.5 sm:text-sm">
          {player.nationality ? (
            <NationalityFlag nationality={player.nationality} className="h-3 w-4 sm:h-3.5 sm:w-5" />
          ) : null}
          {nameNode}
          {player.shirt_number != null ? (
            <span className="shrink-0 text-[0.68rem] font-bold tabular-nums text-slate-500 sm:text-sm">
              {player.shirt_number}
            </span>
          ) : null}
        </div>
        <div
          className={cn(
            'inline-flex min-w-12 items-center justify-center whitespace-nowrap rounded-full px-2 py-1 text-[0.6rem] font-black leading-none shadow-sm sm:min-w-16 sm:px-3 sm:text-xs',
            getPodiumAccentClassName(player.standing)
          )}
        >
          <span className="tabular-nums">{player.points}</span>
          <span className="ml-1">{t('stats.colPoints').toLocaleLowerCase('pt-PT')}</span>
        </div>
      </div>
      <div
        className={cn(
          'mt-3 w-full rounded-full sm:mt-4 md:col-span-2',
          getPodiumBarClassName(player.standing),
          getPodiumAccentClassName(player.standing)
        )}
        aria-hidden
      />
    </article>
  )
}

function MobileLeaderboardRow({
  player,
  isAnonymised,
  highlighted,
  isBottomThree,
}: {
  player: LeaderboardRow
  isAnonymised: boolean
  highlighted: boolean
  isBottomThree: boolean
}) {
  const { t } = useTranslation()

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-background p-3 shadow-sm',
        highlighted && 'border-fcda-gold bg-fcda-gold/10'
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black tabular-nums',
            getRankBadgeClassName(player.standing, isBottomThree)
          )}
        >
          {player.standing}
        </span>
        <div className="min-w-0 flex-1">
          <PlayerIdentity
            name={player.display_name}
            shirtNumber={player.shirt_number}
            shirtNumberPlacement="after-name"
            href={!isAnonymised ? `/players/${player.id}` : undefined}
            avatarUrl={player.avatar_url ?? null}
            nationality={player.nationality}
            showAvatar={!isAnonymised}
            avatarSize="sm"
            nameClassName="font-bold text-fcda-navy"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {t('stats.recordLabel', {
              wins: player.wins,
              draws: player.draws,
              losses: player.losses,
            })}
          </p>
          <FormPills form={player.form} className="mt-2" />
        </div>
        <div className="shrink-0 text-right">
          <div className="text-xl font-black tabular-nums text-fcda-navy">
            {player.points}
          </div>
          <div className="text-xs text-muted-foreground">{t('stats.colPoints')}</div>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 rounded-md bg-muted/40 p-2 text-xs">
        <div>
          <dt className="text-muted-foreground">{t('stats.colGames')}</dt>
          <dd className="font-bold tabular-nums">{player.total}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('stats.colPointsPerGame')}</dt>
          <dd className="font-bold tabular-nums">{formatDecimal(player.pointsPerGame)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('stats.colWinRate')}</dt>
          <dd className="font-bold tabular-nums">{formatPercent(player.winRate)}</dd>
        </div>
      </dl>
    </div>
  )
}

export function StatsTable({
  players,
  formByPlayerId = {},
  isAnonymised,
  highlightedPlayerId = null,
  friendlyRankingToggle = false,
}: Props) {
  const { t } = useTranslation()
  const [searchValue, setSearchValue] = useState('')
  const deferredSearchValue = useDeferredValue(searchValue)
  const [includeFriendlyMatches, setIncludeFriendlyMatches] = useState(false)

  const leaderboardMode: LeaderboardMode =
    friendlyRankingToggle && includeFriendlyMatches ? 'all' : 'competitive'

  const leaderboardRows = useMemo(
    () => buildLeaderboardRows(players, leaderboardMode, formByPlayerId),
    [formByPlayerId, leaderboardMode, players]
  )
  const rows = useMemo(
    () => filterLeaderboardRows(leaderboardRows, deferredSearchValue),
    [deferredSearchValue, leaderboardRows]
  )
  const sortedLeaderboardRows = useMemo(
    () => [...leaderboardRows].sort(compareLeaderboardRows),
    [leaderboardRows]
  )
  const leaders = sortedLeaderboardRows.slice(0, 3)
  const bottomLeaderIds = new Set(sortedLeaderboardRows.slice(-3).map((player) => player.id))
  const highlightedRow = highlightedPlayerId
    ? sortedLeaderboardRows.find((player) => player.id === highlightedPlayerId)
    : null

  if (players.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        {t('stats.noPlayers')}
      </p>
    )
  }

  const columns: Array<DataTableColumn<LeaderboardRow>> = [
    {
      id: 'rank',
      header: t('stats.colRank'),
      sortable: false,
      align: 'center',
      cell: (player) => (
        <span
          className={cn(
            'inline-flex size-7 items-center justify-center rounded-full text-xs font-black tabular-nums',
            getRankBadgeClassName(player.standing, bottomLeaderIds.has(player.id))
          )}
        >
          {player.standing}
        </span>
      ),
    },
    {
      id: 'player',
      header: t('players.colPlayer'),
      sortable: true,
      sortValue: (player) => player.display_name,
      cell: (player) => (
        <PlayerIdentity
          name={player.display_name}
          shirtNumber={player.shirt_number}
          shirtNumberPlacement="after-name"
          href={!isAnonymised ? `/players/${player.id}` : undefined}
          avatarUrl={player.avatar_url ?? null}
          nationality={player.nationality}
          showAvatar={!isAnonymised}
          avatarSize="sm"
        />
      ),
    },
    {
      id: 'form',
      header: t('stats.colForm'),
      sortable: false,
      cell: (player) => <FormPills form={player.form} />,
    },
    {
      id: 'points',
      header: t('stats.colPoints'),
      sortable: true,
      sortValue: (player) => player.points,
      sortComparator: pointsSortComparator,
      align: 'right',
      headerClassName: 'text-fcda-gold/95',
      cellClassName: 'bg-fcda-navy/[0.03]',
      cell: (player) => (
        <span className="tabular-nums text-base font-bold text-fcda-navy">{player.points}</span>
      ),
    },
    {
      id: 'pointsPerGame',
      header: t('stats.colPointsPerGame'),
      sortable: true,
      sortValue: (player) => player.pointsPerGame,
      align: 'right',
      cell: (player) => (
        <span className="tabular-nums">{formatDecimal(player.pointsPerGame)}</span>
      ),
    },
    {
      id: 'winRate',
      header: t('stats.colWinRate'),
      sortable: true,
      sortValue: (player) => player.winRate,
      align: 'right',
      cell: (player) => <span className="tabular-nums">{formatPercent(player.winRate)}</span>,
    },
    {
      id: 'games',
      header: t('stats.colGames'),
      sortable: true,
      sortValue: (player) => player.total,
      align: 'right',
      cell: (player) => <span className="tabular-nums">{player.total}</span>,
    },
    {
      id: 'wins',
      header: t('stats.colWins'),
      sortable: true,
      sortValue: (player) => player.wins,
      align: 'right',
      cell: (player) => <span className="tabular-nums">{player.wins}</span>,
    },
    {
      id: 'draws',
      header: t('stats.colDraws'),
      sortable: true,
      sortValue: (player) => player.draws,
      align: 'right',
      cell: (player) => <span className="tabular-nums">{player.draws}</span>,
    },
    {
      id: 'losses',
      header: t('stats.colLosses'),
      sortable: true,
      sortValue: (player) => player.losses,
      align: 'right',
      cell: (player) => <span className="tabular-nums">{player.losses}</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <section aria-labelledby="leaderboard-leaders-title">
        <div className="mb-3 flex flex-col justify-between gap-1 sm:flex-row sm:items-end">
          <div>
            <h2 id="leaderboard-leaders-title" className="text-lg font-black text-fcda-navy">
              {t('stats.leadersTitle')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {leaderboardMode === 'all'
                ? t('stats.leadersSubtitleAllGames')
                : t('stats.leadersSubtitle')}
            </p>
          </div>
          {highlightedRow ? (
            <div className="rounded-lg border border-fcda-gold bg-fcda-gold/10 px-3 py-2 text-sm">
              <span className="font-bold text-fcda-navy">{t('stats.yourRank')}</span>
              <span className="ml-2 tabular-nums text-muted-foreground">
                #{highlightedRow.standing} - {highlightedRow.points} {t('stats.colPoints').toLocaleLowerCase('pt-PT')}
              </span>
            </div>
          ) : null}
        </div>
        <div className="rounded-md border border-border bg-white px-2 pb-6 pt-7 shadow-sm shadow-fcda-navy/5 sm:px-3 sm:pb-7 sm:pt-9 md:mt-3 md:px-6 md:pb-6 md:pt-8 lg:px-8">
          <div className="grid grid-cols-3 items-end gap-2 sm:gap-6 md:gap-9">
            {leaders.map((player, index) => (
              <LeaderCard
                key={player.id}
                player={player}
                index={index}
                isAnonymised={isAnonymised}
              />
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="leaderboard-table-title" className="space-y-3">
        <div className="sticky top-20 z-40 flex flex-col gap-3 rounded-lg border border-border bg-background p-3 shadow-sm md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 flex-1">
            <h2 id="leaderboard-table-title" className="sr-only">
              {t('stats.tableTitle')}
            </h2>
            <Label htmlFor="player-search">{t('players.nameLabel')}</Label>
            <div className="relative mt-1.5 max-w-md">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="player-search"
                type="search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder={t('players.searchPlaceholder')}
                className="pl-8"
              />
            </div>
          </div>
          {friendlyRankingToggle ? (
            <div className="flex shrink-0 items-center gap-3 md:pb-0.5">
              <Label htmlFor="stats-include-friendly" className="cursor-pointer text-xs font-normal text-muted-foreground">
                {t('stats.includeFriendlyMatchesLabel')}
              </Label>
              <button
                type="button"
                role="switch"
                id="stats-include-friendly"
                aria-checked={includeFriendlyMatches}
                onClick={() => setIncludeFriendlyMatches((v) => !v)}
                className={cn(
                  'relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fcda-navy focus-visible:ring-offset-2',
                  includeFriendlyMatches ? 'bg-fcda-navy' : 'bg-muted'
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'pointer-events-none inline-block size-6 rounded-full bg-white shadow ring-0 transition-transform',
                    includeFriendlyMatches ? 'translate-x-5' : 'translate-x-0.5'
                  )}
                />
              </button>
            </div>
          ) : null}
        </div>

        <p className="text-xs text-muted-foreground">{t('stats.tiebreakerNote')}</p>

        <div className="space-y-3 md:hidden">
          {rows.length > 0 ? (
            [...rows].sort(compareLeaderboardRows).map((player) => (
              <MobileLeaderboardRow
                key={player.id}
                player={player}
                isAnonymised={isAnonymised}
                highlighted={player.id === highlightedPlayerId}
                isBottomThree={bottomLeaderIds.has(player.id)}
              />
            ))
          ) : (
            <p className="py-4 text-sm text-muted-foreground">
              {t('stats.noPlayers')}
            </p>
          )}
        </div>

        <div className="hidden md:block">
          <DataTable
            data={rows}
            columns={columns}
            getRowKey={(player) => player.id}
            rowClassName={(player, index) =>
              cn(
                index % 2 === 0 ? 'bg-background' : 'bg-muted/30',
                player.id === highlightedPlayerId && 'bg-fcda-gold/10 font-semibold'
              )
            }
            emptyState={
              <p className="py-4 text-sm text-muted-foreground">
                {t('stats.noPlayers')}
              </p>
            }
            banner={isAnonymised ? t('stats.anonymisedNote') : undefined}
            defaultSort={{ columnId: 'points', direction: 'desc' }}
            tableClassName="min-w-[54rem]"
          />
        </div>
      </section>
    </div>
  )
}
