import { describe, expect, it } from 'vitest'
import { filterGamesByDateRange } from '@/lib/games/filter-by-date-range'
import type { Game } from '@/types'

function makeGame(id: string, date: string): Game {
  return {
    id,
    date,
    location: 'X',
    recinto_id: null,
    status: 'scheduled',
    counts_for_stats: true,
    score_a: null,
    score_b: null,
    created_by: 'u',
    finished_by: null,
    finished_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}

describe('filterGamesByDateRange', () => {
  const games = [
    makeGame('1', '2026-04-10T10:00:00.000Z'),
    makeGame('2', '2026-04-20T15:00:00.000Z'),
    makeGame('3', '2026-05-01T12:00:00.000Z'),
  ]

  it('returns all games when no range is set', () => {
    expect(filterGamesByDateRange(games)).toEqual(games)
    expect(filterGamesByDateRange(games, undefined, undefined)).toEqual(games)
  })

  it('filters by from date inclusive', () => {
    const r = filterGamesByDateRange(games, '2026-04-20', undefined)
    expect(r.map((g) => g.id)).toEqual(['2', '3'])
  })

  it('filters by to date inclusive', () => {
    const r = filterGamesByDateRange(games, undefined, '2026-04-20')
    expect(r.map((g) => g.id)).toEqual(['1', '2'])
  })

  it('filters by closed interval', () => {
    const r = filterGamesByDateRange(games, '2026-04-11', '2026-04-30')
    expect(r.map((g) => g.id)).toEqual(['2'])
  })

  it('swaps from and to when from > to', () => {
    const r = filterGamesByDateRange(games, '2026-05-01', '2026-04-10')
    expect(r.map((g) => g.id)).toEqual(['1', '2', '3'])
  })

  it('ignores invalid params', () => {
    expect(filterGamesByDateRange(games, 'not-a-date', '2026-04-20').map((g) => g.id)).toEqual([
      '1',
      '2',
    ])
    expect(filterGamesByDateRange(games, '2026-04-20', 'bad').map((g) => g.id)).toEqual(['2', '3'])
  })
})
