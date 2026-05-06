type CalendarGame = {
  id: string
  date: string
  location: string
}
type CalendarOptions = {
  calendarName: string
  calendarDescription: string
  games: CalendarGame[]
  origin: string
  eventSummary: (game: CalendarGame) => string
  eventDescription: (game: CalendarGame, matchUrl: string) => string
  generatedAt?: Date
}

const MATCH_DURATION_MINUTES = 90

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

function formatIcsDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function foldIcsLine(line: string) {
  const chunks: string[] = []
  let remaining = line

  while (remaining.length > 75) {
    chunks.push(remaining.slice(0, 75))
    remaining = remaining.slice(75)
  }

  chunks.push(remaining)
  return chunks.join('\r\n ')
}

export function buildCalendarIcs({
  calendarName,
  calendarDescription,
  games,
  origin,
  eventSummary,
  eventDescription,
  generatedAt = new Date(),
}: CalendarOptions) {
  const now = formatIcsDate(generatedAt)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FCDA//Games Calendar//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    `X-WR-CALDESC:${escapeIcsText(calendarDescription)}`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
    'X-PUBLISHED-TTL:PT15M',
  ]

  for (const game of games) {
    const startsAt = new Date(game.date)
    const endsAt = new Date(startsAt.getTime() + MATCH_DURATION_MINUTES * 60 * 1000)
    const matchUrl = `${origin}/matches/${game.id}`

    lines.push(
      'BEGIN:VEVENT',
      `UID:${game.id}@fcda-os`,
      `DTSTAMP:${now}`,
      `DTSTART:${formatIcsDate(startsAt)}`,
      `DTEND:${formatIcsDate(endsAt)}`,
      `SUMMARY:${escapeIcsText(eventSummary(game))}`,
      `LOCATION:${escapeIcsText(game.location)}`,
      `DESCRIPTION:${escapeIcsText(eventDescription(game, matchUrl))}`,
      `URL:${matchUrl}`,
      'END:VEVENT'
    )
  }

  lines.push('END:VCALENDAR')

  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`
}

export function buildPlayerCalendarIcs({
  playerName,
  games,
  origin,
  generatedAt,
}: {
  playerName: string
  games: CalendarGame[]
  origin: string
  generatedAt?: Date
}) {
  return buildCalendarIcs({
    calendarName: `FCDA - ${playerName}`,
    calendarDescription: `Jogos FCDA associados a ${playerName}`,
    games,
    origin,
    generatedAt,
    eventSummary: () => `FCDA - ${playerName}`,
    eventDescription: (_game, matchUrl) => `Jogo FCDA com ${playerName}. Ficha de jogo: ${matchUrl}`,
  })
}

export function buildAllGamesCalendarIcs({
  games,
  origin,
  generatedAt,
}: {
  games: CalendarGame[]
  origin: string
  generatedAt?: Date
}) {
  return buildCalendarIcs({
    calendarName: 'FCDA - Jogos',
    calendarDescription: 'Todos os jogos FCDA registados na plataforma',
    games,
    origin,
    generatedAt,
    eventSummary: (game) => `FCDA - ${game.location}`,
    eventDescription: (_game, matchUrl) => `Jogo FCDA. Ficha de jogo: ${matchUrl}`,
  })
}
