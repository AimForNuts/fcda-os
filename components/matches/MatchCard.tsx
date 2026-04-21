import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PlayerIdentity } from '@/components/player/PlayerIdentity'
import type { Game } from '@/types'

const STATUS_LABEL: Record<Game['status'], string> = {
  scheduled: 'Agendado',
  finished: 'Terminado',
  cancelled: 'Cancelado',
}

export type LineupSummary = {
  teamA: Array<{ id: string; name: string; avatar_url: string | null }>
  teamB: Array<{ id: string; name: string; avatar_url: string | null }>
  unassigned: Array<{ id: string; name: string; avatar_url: string | null }>
}

type Props = { game: Game; lineup?: LineupSummary; showAvatars?: boolean }

export function MatchCard({ game, lineup, showAvatars = false }: Props) {
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

  const hasTeams = lineup && (lineup.teamA.length > 0 || lineup.teamB.length > 0)
  const hasUnassigned = lineup && lineup.unassigned.length > 0 && !hasTeams

  return (
    <Link href={`/matches/${game.id}`} className="block" aria-label={`${game.location} — ${dateStr}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardContent className="py-4 space-y-2">
          <div className="flex items-center justify-between gap-4">
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
          </div>

          {hasTeams && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 pt-1 border-t border-border/50">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Brancos</p>
                <div className="space-y-1">
                  {lineup!.teamA.map((player) => (
                    <PlayerIdentity
                      key={player.id}
                      name={player.name}
                      avatarUrl={player.avatar_url}
                      showAvatar={showAvatars}
                      avatarSize="sm"
                      className="text-xs"
                      nameClassName="text-xs"
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Pretos</p>
                <div className="space-y-1">
                  {lineup!.teamB.map((player) => (
                    <PlayerIdentity
                      key={player.id}
                      name={player.name}
                      avatarUrl={player.avatar_url}
                      showAvatar={showAvatars}
                      avatarSize="sm"
                      className="text-xs"
                      nameClassName="text-xs"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {hasUnassigned && (
            <div className="space-y-1 border-t border-border/50 pt-1">
              {lineup!.unassigned.map((player) => (
                <PlayerIdentity
                  key={player.id}
                  name={player.name}
                  avatarUrl={player.avatar_url}
                  showAvatar={showAvatars}
                  avatarSize="sm"
                  className="text-xs text-muted-foreground"
                  nameClassName="text-xs"
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
