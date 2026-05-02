export const GAME_TIME_ZONE = 'Europe/Lisbon'

export function formatScheduleDate(date: string) {
  const d = new Date(date)

  return {
    dayMonth: d.toLocaleDateString('pt-PT', {
      day: 'numeric',
      month: 'short',
      timeZone: GAME_TIME_ZONE,
    }),
    weekday: d.toLocaleDateString('pt-PT', {
      weekday: 'long',
      timeZone: GAME_TIME_ZONE,
    }),
    time: d.toLocaleTimeString('pt-PT', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: GAME_TIME_ZONE,
    }),
  }
}
