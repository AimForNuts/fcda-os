import { bcp47ForI18nLanguage } from '@/lib/i18n/date-locale'

export const GAME_TIME_ZONE = 'Europe/Lisbon'

export function formatScheduleDate(date: string, locale = 'pt-PT') {
  const d = new Date(date)
  const bcp47 = bcp47ForI18nLanguage(locale)

  return {
    dayMonth: d.toLocaleDateString(bcp47, {
      day: 'numeric',
      month: 'short',
      timeZone: GAME_TIME_ZONE,
    }),
    weekday: d.toLocaleDateString(bcp47, {
      weekday: 'long',
      timeZone: GAME_TIME_ZONE,
    }),
    time: d.toLocaleTimeString(bcp47, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: GAME_TIME_ZONE,
    }),
  }
}
