import type { Game } from '@/types'

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

function parseDateParam(s: string | undefined): string | undefined {
  if (!s || !ISO_DAY.test(s)) return undefined
  const t = Date.parse(`${s}T00:00:00.000Z`)
  if (Number.isNaN(t)) return undefined
  return s
}

function gameCalendarDay(isoDate: string): string {
  return isoDate.slice(0, 10)
}

/** Keeps games whose calendar day (UTC prefix of `date`) falls in [from, to] inclusive. */
export function filterGamesByDateRange(
  games: Game[],
  fromRaw?: string,
  toRaw?: string,
): Game[] {
  const from = parseDateParam(fromRaw)
  const to = parseDateParam(toRaw)
  if (!from && !to) return games

  let rangeFrom = from
  let rangeTo = to
  if (rangeFrom && rangeTo && rangeFrom > rangeTo) {
    ;[rangeFrom, rangeTo] = [rangeTo, rangeFrom]
  }

  return games.filter((g) => {
    const day = gameCalendarDay(g.date)
    if (rangeFrom && day < rangeFrom) return false
    if (rangeTo && day > rangeTo) return false
    return true
  })
}
