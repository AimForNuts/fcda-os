import type { Game } from '@/types'

export function sortGames(games: Game[]): Game[] {
  const scheduled = games
    .filter(g => g.status === 'scheduled')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const rest = games
    .filter(g => g.status !== 'scheduled')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  return [...scheduled, ...rest]
}
