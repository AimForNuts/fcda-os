'use client'

import { useState, useMemo, useDeferredValue } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Trophy } from 'lucide-react'
import { PlayerIdentity } from '@/components/player/PlayerIdentity'
import { Button } from '@/components/ui/button'
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

function getPodiumClassName(index: number) {
  switch (index) {
    case 0:
      return 'border-fcda-gold bg-fcda-gold/10'
    case 1:
      return 'border-slate-300 bg-slate-50'
    case 2:
      return 'border-amber-700/30 bg-amber-700/5'
    default:
      return 'border-border bg-background'
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

function LeaderboardModeToggle({
  mode,
  onModeChange,
}: {
  mode: LeaderboardMode
  onModeChange: (mode: LeaderboardMode) => void
}) {
  const { t } = useTranslation()
  const options: Array<{ value: LeaderboardMode; label: string }> = [
    { value: 'all', label: t('stats.modeAll') },
    { value: 'competitive', label: t('stats.modeCompetitive') },
  ]

  return (
    <div
      className="inline-flex rounded-lg border border-border bg-muted/40 p-1"
      role="group"
      aria-label={t('stats.modeLabel')}
    >
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={mode === option.value}
          onClick={() => onModeChange(option.value)}
          className={cn(
            'h-7 rounded-md px-3 text-xs font-semibold',
            mode === option.value
              ? 'bg-fcda-navy text-white hover:bg-fcda-navy hover:text-white'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {option.label}
        </Button>
      ))}
    </div>
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

  return (
    <div
      className={cn(
        'rounded-lg border p-4 shadow-sm',
        getPodiumClassName(index)
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fcda-navy text-sm font-black tabular-nums text-white">
          {player.standing}
        </span>
        {index === 0 ? <Trophy className="h-5 w-5 text-fcda-gold" aria-hidden /> : null}
      </div>
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
      <dl className="mt-4 grid grid-cols-3 gap-3 text-xs">
        <div>
          <dt className="text-muted-foreground">{t('stats.colPoints')}</dt>
          <dd className="mt-1 text-lg font-black tabular-nums text-fcda-navy">
            {player.points}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('stats.colGames')}</dt>
          <dd className="mt-1 text-lg font-black tabular-nums text-fcda-navy">
            {player.total}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('stats.colWinRate')}</dt>
          <dd className="mt-1 text-lg font-black tabular-nums text-fcda-navy">
            {formatPercent(player.winRate)}
          </dd>
        </div>
      </dl>
    </div>
  )
}

function MobileLeaderboardRow({
  player,
  isAnonymised,
  highlighted,
}: {
  player: LeaderboardRow
  isAnonymised: boolean
  highlighted: boolean
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
        <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fcda-navy text-sm font-black tabular-nums text-white">
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
}: Props) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<LeaderboardMode>('all')
  const [searchValue, setSearchValue] = useState('')
  const deferredSearchValue = useDeferredValue(searchValue)

  const leaderboardRows = useMemo(
    () => buildLeaderboardRows(players, mode, formByPlayerId),
    [formByPlayerId, mode, players]
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
        <span className="tabular-nums font-semibold text-fcda-navy">{player.standing}</span>
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
            <p className="text-sm text-muted-foreground">{t('stats.leadersSubtitle')}</p>
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
        <div className="grid gap-3 md:grid-cols-3">
          {leaders.map((player, index) => (
            <LeaderCard
              key={player.id}
              player={player}
              index={index}
              isAnonymised={isAnonymised}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="leaderboard-table-title" className="space-y-3">
        <div className="sticky top-20 z-40 -mx-4 flex flex-col gap-3 rounded-lg border border-border bg-background p-3 shadow-sm md:-mx-0 md:flex-row md:items-end md:justify-between">
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
          <LeaderboardModeToggle mode={mode} onModeChange={setMode} />
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
