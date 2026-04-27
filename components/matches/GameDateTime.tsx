'use client'

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
  })
  const timeStr = d.toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const formatted = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)
  return <>{formatted} · {timeStr}</>
}
