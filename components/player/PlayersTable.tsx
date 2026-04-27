'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import { PlayerIdentity } from '@/components/player/PlayerIdentity'
import { PlayerTableFilters } from '@/components/player/PlayerTableFilters'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { cn } from '@/lib/utils'
import type { PlayerPublic } from '@/types'

type PlayerRow = PlayerPublic & {
  avatar_url?: string | null
  total_all: number
}

type Props = {
  players: PlayerRow[]
  isApproved: boolean
  highlightedPlayerId?: string | null
  canViewRatings: boolean
}

export function PlayersTable({ players, isApproved, highlightedPlayerId = null, canViewRatings }: Props) {
  const [searchValue, setSearchValue] = useState('')
  const deferredSearchValue = useDeferredValue(searchValue)

  const filteredPlayers = useMemo(() => {
    const query = deferredSearchValue.trim().toLocaleLowerCase('pt-PT')

    return players.filter((player) => {
      return !query || player.display_name.toLocaleLowerCase('pt-PT').includes(query)
    })
  }, [deferredSearchValue, players])

  const columns: Array<DataTableColumn<PlayerRow>> = [
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
          href={isApproved ? `/players/${player.id}` : undefined}
          avatarUrl={player.avatar_url}
          showAvatar={isApproved}
          avatarSize="sm"
        />
      ),
    },
    {
      id: 'games',
      header: 'Jogos',
      sortable: true,
      sortValue: (player) => player.total_all,
      align: 'right',
      cell: (player) => <span className="tabular-nums">{player.total_all}</span>,
    },
    ...(canViewRatings
      ? [
          {
            id: 'current_rating',
            header: 'Nota',
            sortable: true,
            sortValue: (player: PlayerRow) => player.current_rating,
            align: 'right' as const,
            cell: (player: PlayerRow) => (
              <span className="tabular-nums font-medium">
                {player.current_rating != null ? player.current_rating.toFixed(1) : '—'}
              </span>
            ),
          },
        ]
      : []),
  ]

  return (
    <div>
      <PlayerTableFilters
        searchValue={searchValue}
        onSearchChange={setSearchValue}
      />
      <DataTable
        data={filteredPlayers}
        columns={columns}
        getRowKey={(player) => player.id}
        rowClassName={(player, index) =>
          cn(
            index % 2 === 0 ? 'bg-background' : 'bg-muted/30',
            player.id === highlightedPlayerId && 'bg-fcda-gold/10 font-semibold'
          )
        }
        emptyState={
          <p className="text-sm text-muted-foreground py-4">Sem jogadores registados.</p>
        }
        defaultSort={{ columnId: 'player', direction: 'asc' }}
      />
    </div>
  )
}
