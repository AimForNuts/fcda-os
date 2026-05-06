import { describe, expect, it } from 'vitest'
import {
  buildPlayerTable,
  createAiLineupSchema,
  randomizeAiLineupCaptains,
  validateAiLineup,
} from '@/lib/ai-assistant/lineup'
import type { AiLineup } from '@/lib/ai-assistant/lineup'

const p1 = '11111111-1111-4111-8111-111111111111'
const p2 = '22222222-2222-4222-8222-222222222222'
const p3 = '33333333-3333-4333-8333-333333333333'
const p4 = '44444444-4444-4444-8444-444444444444'
const p5 = '55555555-5555-4555-8555-555555555555'
const outsider = '66666666-6666-4666-8666-666666666666'

function lineup(overrides: Partial<AiLineup> = {}): AiLineup {
  return {
    team_a: {
      label: 'Equipa Branca',
      players: [
        { player_id: p1, is_captain: true },
        { player_id: p2, is_captain: false },
      ],
    },
    team_b: {
      label: 'Equipa Azul',
      players: [
        { player_id: p3, is_captain: true },
        { player_id: p4, is_captain: false },
      ],
    },
    notes: [],
    reasoning: [],
    ...overrides,
  }
}

describe('validateAiLineup', () => {
  it('accepts a valid exact roster lineup', () => {
    expect(validateAiLineup(lineup(), [p1, p2, p3, p4])).toEqual({ ok: true, errors: [] })
  })

  it('accepts uneven team sizes when the roster has an odd player count', () => {
    const result = validateAiLineup(
      lineup({
        team_a: {
          label: 'Equipa Branca',
          players: [
            { player_id: p1, is_captain: true },
            { player_id: p2, is_captain: false },
            { player_id: p5, is_captain: false },
          ],
        },
      }),
      [p1, p2, p3, p4, p5]
    )

    expect(result.ok).toBe(true)
  })

  it('rejects missing roster players', () => {
    const result = validateAiLineup(lineup(), [p1, p2, p3, p4, p5])
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toContain('Missing players')
  })

  it('rejects duplicate players', () => {
    const result = validateAiLineup(
      lineup({
        team_b: {
          label: 'Equipa Azul',
          players: [
            { player_id: p1, is_captain: true },
            { player_id: p4, is_captain: false },
          ],
        },
      }),
      [p1, p2, p3, p4]
    )

    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toContain('Duplicate players')
  })

  it('includes player names in validation errors when labels are provided', () => {
    const result = validateAiLineup(
      lineup({
        team_b: {
          label: 'Equipa Azul',
          players: [
            { player_id: p1, is_captain: true },
            { player_id: p4, is_captain: false },
          ],
        },
      }),
      [p1, p2, p3, p4],
      { playerLabels: new Map([[p1, 'Player One']]) }
    )

    expect(result.errors).toContain(`Duplicate players: Player One (${p1})`)
  })

  it('rejects players outside the roster', () => {
    const result = validateAiLineup(
      lineup({
        team_b: {
          label: 'Equipa Azul',
          players: [
            { player_id: p3, is_captain: true },
            { player_id: outsider, is_captain: false },
          ],
        },
      }),
      [p1, p2, p3, p4]
    )

    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toContain('Players outside roster')
  })

  it('rejects teams without exactly one captain', () => {
    const result = validateAiLineup(
      lineup({
        team_a: {
          label: 'Equipa Branca',
          players: [
            { player_id: p1, is_captain: false },
            { player_id: p2, is_captain: false },
          ],
        },
      }),
      [p1, p2, p3, p4]
    )

    expect(result.ok).toBe(false)
    expect(result.errors).toContain('Team White must have exactly one captain')
  })

  it('rejects teams with multiple captains', () => {
    const result = validateAiLineup(
      lineup({
        team_b: {
          label: 'Equipa Azul',
          players: [
            { player_id: p3, is_captain: true },
            { player_id: p4, is_captain: true },
          ],
        },
      }),
      [p1, p2, p3, p4]
    )

    expect(result.ok).toBe(false)
    expect(result.errors).toContain('Team Blue must have exactly one captain')
  })
})

describe('createAiLineupSchema', () => {
  it('rejects UUID-shaped player ids that are not in the roster', () => {
    const schema = createAiLineupSchema([p1, p2, p3, p4])
    const result = schema.safeParse(
      lineup({
        team_b: {
          label: 'Equipa Azul',
          players: [
            { player_id: p3, is_captain: true },
            { player_id: outsider, is_captain: false },
          ],
        },
      })
    )

    expect(result.success).toBe(false)
  })
})

describe('buildPlayerTable', () => {
  it('includes last 5 ratings, overall win percent, and last 5 win percent', () => {
    const table = buildPlayerTable([{
      id: p1,
      sheet_name: 'Player One',
      shirt_number: 10,
      nationality: 'PT',
      current_rating: 7.25,
      preferred_positions: ['W'],
      last5Ratings: [8, 7, 7.5, 6, 8.5],
      totalGames: 20,
      winPct: 55,
      last5Games: 5,
      last5WinPct: 80,
      recentFeedback: ['Fast transitions.'],
    }])

    expect(table).toContain('Last 5 ratings: 8.0 / 7.0 / 7.5 / 6.0 / 8.5')
    expect(table).toContain('Overall win %: 55% over 20')
    expect(table).toContain('Last 5 win %: 80% over 5')
  })
})

describe('randomizeAiLineupCaptains', () => {
  it('assigns exactly one random captain per team without changing team membership', () => {
    const randomized = randomizeAiLineupCaptains(
      lineup({
        team_a: {
          label: 'Equipa Branca',
          players: [
            { player_id: p1, is_captain: true },
            { player_id: p2, is_captain: false },
          ],
        },
        team_b: {
          label: 'Equipa Azul',
          players: [
            { player_id: p3, is_captain: true },
            { player_id: p4, is_captain: false },
          ],
        },
      }),
      () => 1
    )

    expect(randomized.team_a.players.map((player) => player.player_id)).toEqual([p1, p2])
    expect(randomized.team_b.players.map((player) => player.player_id)).toEqual([p3, p4])
    expect(randomized.team_a.players.map((player) => player.is_captain)).toEqual([false, true])
    expect(randomized.team_b.players.map((player) => player.is_captain)).toEqual([false, true])
  })
})
