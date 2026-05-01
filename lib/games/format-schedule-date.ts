export function formatScheduleDate(date: string) {
  const d = new Date(date)

  return {
    dayMonth: d.toLocaleDateString('pt-PT', {
      day: 'numeric',
      month: 'short',
    }),
    weekday: d.toLocaleDateString('pt-PT', { weekday: 'long' }),
    time: d.toLocaleTimeString('pt-PT', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  }
}
