import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Game } from '@/types'

const STATUS_LABEL: Record<Game['status'], string> = {
  scheduled: 'Agendado',
  finished: 'Terminado',
  cancelled: 'Cancelado',
}

type Props = { game: Game }

export function MatchCard({ game }: Props) {
  const d = new Date(game.date)
  const dateStr = d.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const timeStr = d.toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <Link href={`/matches/${game.id}`} className="block" aria-label={`${game.location} — ${dateStr}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardContent className="flex items-center justify-between gap-4 py-4">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium">
              {dateStr} · {timeStr}
            </p>
            <p className="text-sm text-muted-foreground">{game.location}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {game.status === 'finished' &&
              game.score_a != null &&
              game.score_b != null && (
                <span className="text-lg font-bold tabular-nums">
                  {game.score_a} – {game.score_b}
                </span>
              )}
            <Badge
              variant={
                game.status === 'finished'
                  ? 'default'
                  : game.status === 'cancelled'
                    ? 'destructive'
                    : 'secondary'
              }
            >
              {STATUS_LABEL[game.status]}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
