'use client'

import { GAME_TIME_ZONE } from '@/lib/games/format-schedule-date'

type Props = {
  iso: string
}

export function GameDateTime({ iso }: Props) {
  const d = new Date(iso)
  const dateStr = d.toLocaleDateString('pt-PT', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: GAME_TIME_ZONE,
  })
  const timeStr = d.toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: GAME_TIME_ZONE,
  })
  const formatted = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)
  return <>{formatted} · {timeStr}</>
}
