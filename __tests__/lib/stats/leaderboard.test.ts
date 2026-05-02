import { describe, expect, it } from 'vitest'
import {
  buildLeaderboardFormByPlayerId,
  buildLeaderboardRows,
  filterLeaderboardRows,
  getLeaderboardMatchResult,
  type LeaderboardPlayer,
} from '@/lib/stats/leaderboard'

const basePlayer = {
  shirt_number: null,
  profile_id: null,
  avatar_path: null,
  total_comp: 0,
  wins_comp: 0,
  draws_comp: 0,
  losses_comp: 0,
}

const players: LeaderboardPlayer[] = [
  {
    ...basePlayer,
    id: '1',
    display_name: 'Carlos Silva',
    total_all: 20,
    wins_all: 10,
    draws_all: 5,
    losses_all: 5,
    total_comp: 10,
    wins_comp: 5,
    draws_comp: 3,
    losses_comp: 2,
  },
  {
    ...basePlayer,
    id: '2',
    display_name: 'Joao Costa',
    total_all: 15,
    wins_all: 6,
    draws_all: 4,
    losses_all: 5,
    total_comp: 8,
    wins_comp: 3,
    draws_comp: 2,
    losses_comp: 3,
  },
  {
    ...basePlayer,
    id: '3',
    display_name: 'Andre Ramos',
    total_all: 15,
    wins_all: 6,
    draws_all: 4,
    losses_all: 5,
  },
]

describe('leaderboard helpers', () => {
  it('builds all-game rows with points, points per game, and win rate', () => {
    const [carlos] = buildLeaderboardRows(players, 'all')

    expect(carlos).toMatchObject({
      id: '1',
      total: 20,
      wins: 10,
      draws: 5,
      losses: 5,
      points: 35,
      standing: 1,
    })
    expect(carlos.pointsPerGame).toBe(1.75)
    expect(carlos.winRate).toBe(0.5)
  })

  it('uses competitive totals in competitive mode', () => {
    const [carlos] = buildLeaderboardRows(players, 'competitive')

    expect(carlos).toMatchObject({
      total: 10,
      wins: 5,
      draws: 3,
      losses: 2,
      points: 18,
    })
  })

  it('attaches form for the selected mode', () => {
    const rows = buildLeaderboardRows(players, 'competitive', {
      '1': {
        all: ['win', 'draw'],
        competitive: ['win'],
      },
    })

    expect(rows.find((row) => row.id === '1')?.form).toEqual(['win'])
  })

  it('assigns shared standings for rows tied after tiebreakers', () => {
    const rows = buildLeaderboardRows(players, 'all')

    expect(rows.find((row) => row.id === '1')?.standing).toBe(1)
    expect(rows.find((row) => row.id === '2')?.standing).toBe(2)
    expect(rows.find((row) => row.id === '3')?.standing).toBe(2)
  })

  it('filters names without accents or casing sensitivity', () => {
    const rows = buildLeaderboardRows(players, 'all')
    const filtered = filterLeaderboardRows(rows, 'andré')

    expect(filtered).toHaveLength(1)
    expect(filtered[0].display_name).toBe('Andre Ramos')
  })

  it('resolves a player match result from team and score', () => {
    expect(getLeaderboardMatchResult({ team: 'a', score_a: 2, score_b: 1 })).toBe('win')
    expect(getLeaderboardMatchResult({ team: 'b', score_a: 2, score_b: 1 })).toBe('loss')
    expect(getLeaderboardMatchResult({ team: 'b', score_a: 2, score_b: 2 })).toBe('draw')
    expect(getLeaderboardMatchResult({ team: null, score_a: 2, score_b: 1 })).toBeNull()
  })

  it('builds recent form by player and mode', () => {
    const form = buildLeaderboardFormByPlayerId(
      [
        {
          player_id: '1',
          game_id: 'old-friendly',
          team: 'a',
          date: '2026-01-01T10:00:00Z',
          counts_for_stats: false,
          score_a: 1,
          score_b: 0,
        },
        {
          player_id: '1',
          game_id: 'new-competitive',
          team: 'a',
          date: '2026-01-03T10:00:00Z',
          counts_for_stats: true,
          score_a: 1,
          score_b: 1,
        },
        {
          player_id: '1',
          game_id: 'new-friendly',
          team: 'b',
          date: '2026-01-04T10:00:00Z',
          counts_for_stats: false,
          score_a: 3,
          score_b: 1,
        },
      ],
      2
    )

    expect(form['1'].all).toEqual(['loss', 'draw'])
    expect(form['1'].competitive).toEqual(['draw'])
  })
})
