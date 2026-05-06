import { describe, expect, it } from 'vitest'
import { buildPlayerCalendarIcs } from '@/lib/calendar/ics'

describe('buildPlayerCalendarIcs', () => {
  it('builds a subscription calendar for a player game', () => {
    const ics = buildPlayerCalendarIcs({
      playerName: 'Jose Oliveira',
      origin: 'https://fcda.example',
      generatedAt: new Date('2026-05-06T08:00:00.000Z'),
      games: [
        {
          id: 'game-1',
          date: '2026-05-07T20:30:00.000Z',
          location: 'Areosa',
          playerTeamLabel: 'Team Blue',
        },
      ],
    })

    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('X-WR-CALNAME:FCDA - Jose Oliveira')
    expect(ics).toContain('UID:game-1@fcda-os')
    expect(ics).toContain('DTSTART:20260507T203000Z')
    expect(ics).toContain('DTEND:20260507T213000Z')
    expect(ics).toContain('SUMMARY:FCDA - Team Blue')
    expect(ics).toContain('DESCRIPTION:Game time: 21:30 - 22:30\\nLocation: Areosa')
    expect(ics).not.toContain('Player: Jose Oliveira')
    expect(ics).toContain('URL:https://fcda.example/matches/game-1')
  })

  it('escapes calendar text fields', () => {
    const ics = buildPlayerCalendarIcs({
      playerName: 'Jose, Oliveira',
      origin: 'https://fcda.example',
      generatedAt: new Date('2026-05-06T08:00:00.000Z'),
      games: [
        {
          id: 'game-1',
          date: '2026-05-07T20:30:00.000Z',
          location: 'Pitch; A',
        },
      ],
    })

    expect(ics).toContain('X-WR-CALNAME:FCDA - Jose\\, Oliveira')
    expect(ics).toContain('LOCATION:Pitch\\; A')
  })
})
