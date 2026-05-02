import { describe, expect, it } from 'vitest'
import { formatScheduleDate } from '@/lib/games/format-schedule-date'

describe('formatScheduleDate', () => {
  it('formats game times in Portugal time during daylight saving time', () => {
    const result = formatScheduleDate('2026-05-03T10:00:00.000Z')

    expect(result.time).toBe('11:00')
  })
})
