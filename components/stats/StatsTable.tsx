'use client'

import { useState, useMemo, useDeferredValue } from 'react'
import { useTranslation } from 'react-i18next'
import type { PlayerStats } from '@/types'
import { PlayerIdentity } from '@/components/player/PlayerIdentity'
import { PlayerTableFilters } from '@/components/player/PlayerTableFilters'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { cn } from '@/lib/utils'

type Props = {
  players: Array<PlayerStats & { avatar_url?: string | null }>
  isAnonymised: boolean
  highlightedPlayerId?: string | null
}

type StatsRow = (PlayerStats & { avatar_url?: string | null }) & {
  total: number
  wins: number
  draws: number
  losses: number
  points: number
  standing: number
}

function comparePointsStanding(
  a: { points: number; wins: number; total: number },
  b: { points: number; wins: number; total: number },
): number {
  if (b.points !== a.points) return b.points - a.points
  if (b.wins !== a.wins) return b.wins - a.wins
  return b.total - a.total
}

export function StatsTable({
  players,
  isAnonymised,
  highlightedPlayerId = null,
}: Props) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<'all' | 'competitive'>('all')
  const [searchValue, setSearchValue] = useState('')
  const deferredSearchValue = useDeferredValue(searchValue)

  const rows = useMemo(() => {
    const normalize = (s: string) =>
      s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-PT')
    const query = normalize(deferredSearchValue.trim())

    const withStats = players.map((player) => {
      const total = mode === 'all' ? player.total_all : player.total_comp
      const wins = mode === 'all' ? player.wins_all : player.wins_comp
      const draws = mode === 'all' ? player.draws_all : player.draws_comp
      const losses = mode === 'all' ? player.losses_all : player.losses_comp
      const points = 3 * wins + draws

      return { ...player, total, wins, draws, losses, points }
    })

    const sortedForStanding = [...withStats].sort(comparePointsStanding)
    const standingById = new Map<string, number>()
    sortedForStanding.forEach((row, index) => {
      standingById.set(row.id, index + 1)
    })

    return withStats
      .filter((player) => {
        return !query || normalize(player.display_name).includes(query)
      })
      .map((row) => ({ ...row, standing: standingById.get(row.id) ?? 0 }))
  }, [deferredSearchValue, mode, players])

  if (players.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        {t('stats.noPlayers')}
      </p>
    )
  }

  const columns: Array<DataTableColumn<StatsRow>> = [
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
          showAvatar={!isAnonymised}
          avatarSize="sm"
        />
      ),
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
    {
      id: 'points',
      header: t('stats.colPoints'),
      sortable: true,
      sortValue: (player) => player.points,
      sortComparator: (a, b) => {
        if (a.points !== b.points) return a.points - b.points
        if (a.wins !== b.wins) return a.wins - b.wins
        return a.total - b.total
      },
      align: 'right',
      headerClassName: 'text-fcda-gold/95',
      cellClassName: 'bg-fcda-navy/[0.03]',
      cell: (player) => (
        <span className="tabular-nums text-base font-bold text-fcda-navy">{player.points}</span>
      ),
    },
  ]

  return (
    <div>
      <PlayerTableFilters
        searchValue={searchValue}
        onSearchChange={setSearchValue}
      />
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setMode('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            mode === 'all'
              ? 'bg-fcda-navy text-white'
              : 'border border-input text-muted-foreground hover:bg-muted'
          }`}
        >
          {t('stats.modeAll')}
        </button>
        <button
          type="button"
          onClick={() => setMode('competitive')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            mode === 'competitive'
              ? 'bg-fcda-navy text-white'
              : 'border border-input text-muted-foreground hover:bg-muted'
          }`}
        >
          {t('stats.modeCompetitive')}
        </button>
      </div>

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
          <p className="text-sm text-muted-foreground py-4">
            {t('stats.noPlayers')}
          </p>
        }
        banner={isAnonymised ? t('stats.anonymisedNote') : undefined}
        defaultSort={{ columnId: 'points', direction: 'desc' }}
        tableClassName="min-w-[36rem]"
      />
    </div>
  )
}
