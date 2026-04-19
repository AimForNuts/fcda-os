'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { PlayerStats } from '@/types'

type SortCol = 'total' | 'wins' | 'draws' | 'losses' | 'points'

type Props = {
  players: PlayerStats[]
  isAnonymised: boolean
}

export function StatsTable({ players, isAnonymised }: Props) {
  const [mode, setMode] = useState<'all' | 'competitive'>('all')
  const [sortCol, setSortCol] = useState<SortCol>('total')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  function handleSort(col: SortCol) {
    if (col === sortCol) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortCol(col)
      setSortDir('desc')
    }
  }

  const rows = useMemo(() => {
    return [...players]
      .map((p) => {
        const total = mode === 'all' ? p.total_all : p.total_comp
        const wins = mode === 'all' ? p.wins_all : p.wins_comp
        const draws = mode === 'all' ? p.draws_all : p.draws_comp
        const losses = mode === 'all' ? p.losses_all : p.losses_comp
        const points = 3 * wins + draws
        return { ...p, total, wins, draws, losses, points }
      })
      .sort((a, b) => {
        const diff = a[sortCol] - b[sortCol]
        return sortDir === 'desc' ? -diff : diff
      })
  }, [players, mode, sortCol, sortDir])

  if (players.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Sem dados de jogadores.
      </p>
    )
  }

  const cols: { col: SortCol; label: string }[] = [
    { col: 'total', label: 'Total' },
    { col: 'wins', label: 'V' },
    { col: 'draws', label: 'E' },
    { col: 'losses', label: 'D' },
    { col: 'points', label: 'Pts' },
  ]

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
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

      <div className="rounded-lg border border-border overflow-hidden">
        {isAnonymised && (
          <div className="bg-fcda-ice px-4 py-2 text-xs text-fcda-navy/70 border-b border-border">
            Inicia sessão para ver os nomes dos jogadores.
          </div>
        )}
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-fcda-navy text-white text-xs uppercase tracking-wide">
              <th className="px-4 py-2.5 text-left font-semibold">Jogador</th>
              {cols.map(({ col, label }) => {
                const active = sortCol === col
                return (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSort(col)}
                    tabIndex={0}
                    aria-sort={active ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
                    className="px-4 py-2.5 text-right font-semibold cursor-pointer select-none whitespace-nowrap"
                  >
                    {label}{active ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => (
              <tr
                key={p.id}
                className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}
              >
                <td className="px-4 py-2.5">
                  {p.shirt_number != null && (
                    <span className="text-muted-foreground text-xs mr-2 tabular-nums">
                      #{p.shirt_number}
                    </span>
                  )}
                  {!isAnonymised ? (
                    <Link href={`/players/${p.id}`} className="hover:underline">
                      {p.display_name}
                    </Link>
                  ) : (
                    p.display_name
                  )}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{p.total}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{p.wins}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{p.draws}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{p.losses}</td>
                <td className="px-4 py-2.5 text-right tabular-nums font-medium">{p.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
