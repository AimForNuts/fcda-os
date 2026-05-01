import { describe, expect, it } from 'vitest'
import { validateLineupCaptains } from '@/lib/games/lineup'

describe('validateLineupCaptains', () => {
  it('allows manual saves with no captains', () => {
    expect(validateLineupCaptains([
      { player_id: 'p1', team: 'a' },
      { player_id: 'p2', team: 'b' },
    ])).toEqual({
      ok: true,
      error: null,
      captainCounts: { a: 0, b: 0 },
    })
  })

  it('allows one captain per team', () => {
    expect(validateLineupCaptains([
      { player_id: 'p1', team: 'a', is_captain: true },
      { player_id: 'p2', team: 'b', is_captain: true },
    ])).toEqual({
      ok: true,
      error: null,
      captainCounts: { a: 1, b: 1 },
    })
  })

  it('rejects captains without a team', () => {
    const result = validateLineupCaptains([{ player_id: 'p1', team: null, is_captain: true }])
    expect(result.ok).toBe(false)
    expect(result.error).toBe('Captain must be assigned to a team')
  })

  it('rejects more than one captain per team', () => {
    const result = validateLineupCaptains([
      { player_id: 'p1', team: 'a', is_captain: true },
      { player_id: 'p2', team: 'a', is_captain: true },
    ])

    expect(result.ok).toBe(false)
    expect(result.error).toBe('Only one captain is allowed per team')
  })

  it('rejects duplicate players', () => {
    const result = validateLineupCaptains([
      { player_id: 'p1', team: 'a' },
      { player_id: 'p1', team: 'b' },
    ])

    expect(result.ok).toBe(false)
    expect(result.error).toBe('Lineup contains duplicate players')
  })
})
