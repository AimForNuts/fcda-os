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
          mapLocation: 'Rua da Areosa, Porto',
          mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Areosa',
          latitude: 41.123,
          longitude: -8.456,
          playerTeamLabel: 'Team Blue',
        },
      ],
    })
    const unfoldedIcs = ics.replace(/\r\n /g, '')

    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('X-WR-CALNAME:FCDA - Jose Oliveira')
    expect(ics).toContain('UID:game-1@fcda-os')
    expect(ics).toContain('DTSTART:20260507T203000Z')
    expect(ics).toContain('DTEND:20260507T213000Z')
    expect(ics).toContain('SUMMARY:FCDA - Team Blue')
    expect(ics).toContain('LOCATION:Rua da Areosa\\, Porto')
    expect(ics).toContain('GEO:41.123;-8.456')
    expect(ics).toContain('DESCRIPTION:Game time: 21:30 - 22:30\\nLocation: Areosa')
    expect(unfoldedIcs).toContain('Map: https://www.google.com/maps/search/?api=1&query=Areosa')
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
