'use client'

import { useState, useMemo, useDeferredValue } from 'react'
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
}

export function StatsTable({
  players,
  isAnonymised,
  highlightedPlayerId = null,
}: Props) {
  const [mode, setMode] = useState<'all' | 'competitive'>('all')
  const [searchValue, setSearchValue] = useState('')
  const deferredSearchValue = useDeferredValue(searchValue)

  const rows = useMemo(() => {
    const query = deferredSearchValue.trim().toLocaleLowerCase('pt-PT')

    return players
      .map((player) => {
        const total = mode === 'all' ? player.total_all : player.total_comp
        const wins = mode === 'all' ? player.wins_all : player.wins_comp
        const draws = mode === 'all' ? player.draws_all : player.draws_comp
        const losses = mode === 'all' ? player.losses_all : player.losses_comp
        const points = 3 * wins + draws

        return { ...player, total, wins, draws, losses, points }
      })
      .filter((player) => {
        return !query || player.display_name.toLocaleLowerCase('pt-PT').includes(query)
      })
  }, [deferredSearchValue, mode, players])

  if (players.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Sem dados de jogadores.
      </p>
    )
  }

  const columns: Array<DataTableColumn<StatsRow>> = [
    {
      id: 'shirt_number',
      header: '#',
      sortable: true,
      sortValue: (player) => player.shirt_number,
      cell: (player) => (
        <span className="text-muted-foreground tabular-nums">
          {player.shirt_number ?? '—'}
        </span>
      ),
    },
    {
      id: 'player',
      header: 'Jogador',
      sortable: true,
      sortValue: (player) => player.display_name,
      cell: (player) => (
        <PlayerIdentity
          name={player.display_name}
          href={!isAnonymised ? `/players/${player.id}` : undefined}
          avatarUrl={player.avatar_url ?? null}
          showAvatar={!isAnonymised}
          avatarSize="sm"
        />
      ),
    },
    {
      id: 'games',
      header: 'Jogos',
      sortable: true,
      sortValue: (player) => player.total,
      align: 'right',
      cell: (player) => <span className="tabular-nums">{player.total}</span>,
    },
    {
      id: 'wins',
      header: 'Vitórias',
      sortable: true,
      sortValue: (player) => player.wins,
      align: 'right',
      cell: (player) => <span className="tabular-nums">{player.wins}</span>,
    },
    {
      id: 'draws',
      header: 'Empates',
      sortable: true,
      sortValue: (player) => player.draws,
      align: 'right',
      cell: (player) => <span className="tabular-nums">{player.draws}</span>,
    },
    {
      id: 'losses',
      header: 'Derrotas',
      sortable: true,
      sortValue: (player) => player.losses,
      align: 'right',
      cell: (player) => <span className="tabular-nums">{player.losses}</span>,
    },
    {
      id: 'points',
      header: 'Pontos',
      sortable: true,
      sortValue: (player) => player.points,
      align: 'right',
      cell: (player) => <span className="tabular-nums font-medium">{player.points}</span>,
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
          Todos
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
          Competitivos
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
            Sem dados de jogadores.
          </p>
        }
        banner={
          isAnonymised
            ? 'Inicia sessão para ver os nomes dos jogadores.'
            : undefined
        }
        defaultSort={{ columnId: 'games', direction: 'desc' }}
      />
    </div>
  )
}
