import { afterEach, describe, expect, it } from 'vitest'
import { createPlayerCalendarToken, readPlayerCalendarToken } from '@/lib/calendar/token'

const ORIGINAL_SECRET = process.env.SUPABASE_SECRET_KEY

afterEach(() => {
  process.env.SUPABASE_SECRET_KEY = ORIGINAL_SECRET
})

describe('player calendar tokens', () => {
  it('round-trips a player id without exposing it as plain text', () => {
    process.env.SUPABASE_SECRET_KEY = 'test-secret'
    const playerId = 'c2b6ef0e-105d-4af4-9814-34a33e85325b'
    const token = createPlayerCalendarToken(playerId)

    expect(token).not.toContain(playerId)
    expect(readPlayerCalendarToken(token)).toBe(playerId)
  })

  it('rejects tampered tokens', () => {
    process.env.SUPABASE_SECRET_KEY = 'test-secret'
    const token = createPlayerCalendarToken('c2b6ef0e-105d-4af4-9814-34a33e85325b')

    expect(readPlayerCalendarToken(`${token}x`)).toBeNull()
  })
})
