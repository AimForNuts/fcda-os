import { describe, it, expect } from 'vitest'
import { sortGames } from '@/lib/games/sort'
import type { Game } from '@/types'

function makeGame(overrides: Partial<Game>): Game {
  return {
    id: 'id',
    date: '2025-01-01T10:00:00',
    location: 'Field',
    recinto_id: null,
    status: 'scheduled',
    counts_for_stats: true,
    score_a: null,
    score_b: null,
    created_by: 'user-1',
    finished_by: null,
    finished_at: null,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    ...overrides,
  }
}

describe('sortGames', () => {
  it('puts scheduled games before finished games', () => {
    const games = [
      makeGame({ id: 'a', status: 'finished', date: '2025-06-01T10:00:00' }),
      makeGame({ id: 'b', status: 'scheduled', date: '2025-07-01T10:00:00' }),
    ]
    const sorted = sortGames(games)
    expect(sorted[0].id).toBe('b')
    expect(sorted[1].id).toBe('a')
  })

  it('sorts scheduled games ascending by date (nearest first)', () => {
    const games = [
      makeGame({ id: 'b', status: 'scheduled', date: '2025-07-10T10:00:00' }),
      makeGame({ id: 'a', status: 'scheduled', date: '2025-07-01T10:00:00' }),
    ]
    const sorted = sortGames(games)
    expect(sorted[0].id).toBe('a')
    expect(sorted[1].id).toBe('b')
  })

  it('sorts finished games descending by date (most recent first)', () => {
    const games = [
      makeGame({ id: 'a', status: 'finished', date: '2025-05-01T10:00:00' }),
      makeGame({ id: 'b', status: 'finished', date: '2025-06-01T10:00:00' }),
    ]
    const sorted = sortGames(games)
    expect(sorted[0].id).toBe('b')
    expect(sorted[1].id).toBe('a')
  })

  it('puts cancelled games with finished (after scheduled), sorted descending', () => {
    const games = [
      makeGame({ id: 'a', status: 'cancelled', date: '2025-06-01T10:00:00' }),
      makeGame({ id: 'b', status: 'scheduled', date: '2025-07-01T10:00:00' }),
      makeGame({ id: 'c', status: 'finished', date: '2025-05-01T10:00:00' }),
    ]
    const sorted = sortGames(games)
    expect(sorted[0].id).toBe('b')  // scheduled first
    expect(sorted[1].id).toBe('a')  // cancelled, more recent
    expect(sorted[2].id).toBe('c')  // finished, older
  })

  it('returns empty array unchanged', () => {
    expect(sortGames([])).toEqual([])
  })
})
