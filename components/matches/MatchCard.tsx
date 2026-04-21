'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PlayerIdentity } from '@/components/player/PlayerIdentity'
import { TeamHeader } from '@/components/matches/TeamHeader'
import { getTeamPresentation } from '@/lib/games/team-presentation'
import type { Game } from '@/types'

const STATUS_LABEL: Record<Game['status'], string> = {
  scheduled: 'Agendado',
  finished: 'Terminado',
  cancelled: 'Cancelado',
}

export type LineupSummary = {
  teamA: Array<{ id: string; name: string; avatar_url: string | null; shirt_number: number | null }>
  teamB: Array<{ id: string; name: string; avatar_url: string | null; shirt_number: number | null }>
  unassigned: Array<{ id: string; name: string; avatar_url: string | null; shirt_number: number | null }>
}

function toTitleCase(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

type Props = { game: Game; lineup?: LineupSummary; showAvatars?: boolean }

export function MatchCard({ game, lineup, showAvatars = false }: Props) {
  const [collapsed, setCollapsed] = useState(
    game.status === 'finished' || game.status === 'cancelled'
  )

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
  const hasPlayers = hasTeams || hasUnassigned

  const kitA = getTeamPresentation('a')
  const kitB = getTeamPresentation('b')

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
                  <span className="flex items-center gap-1.5">
                    <Image
                      src={kitA.imageSrc}
                      alt=""
                      width={40}
                      height={55}
                      className="h-7 w-auto shrink-0 object-contain opacity-90"
                      aria-hidden
                    />
                    <span className="text-lg font-bold tabular-nums">
                      {game.score_a} – {game.score_b}
                    </span>
                    <Image
                      src={kitB.imageSrc}
                      alt=""
                      width={40}
                      height={55}
                      className="h-7 w-auto shrink-0 object-contain opacity-90"
                      aria-hidden
                    />
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
              {hasPlayers && (
                <button
                  type="button"
                  aria-label="toggle players"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setCollapsed((c) => !c)
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
              )}
            </div>
          </div>

          {!collapsed && hasTeams && (
            <div className="grid gap-3 border-t border-border/50 pt-2 sm:grid-cols-2">
              <div className="space-y-2">
                <TeamHeader team="a" />
                <div className="space-y-1">
                  {lineup!.teamA.map((player) => (
                    <PlayerIdentity
                      key={player.id}
                      name={toTitleCase(player.name)}
                      shirtNumber={player.shirt_number}
                      avatarUrl={player.avatar_url}
                      showAvatar={showAvatars}
                      avatarSize="sm"
                      className="text-xs"
                      nameClassName="text-xs"
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <TeamHeader team="b" />
                <div className="space-y-1">
                  {lineup!.teamB.map((player) => (
                    <PlayerIdentity
                      key={player.id}
                      name={toTitleCase(player.name)}
                      shirtNumber={player.shirt_number}
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

          {!collapsed && hasUnassigned && (
            <div className="space-y-1 border-t border-border/50 pt-1">
              {lineup!.unassigned.map((player) => (
                <PlayerIdentity
                  key={player.id}
                  name={toTitleCase(player.name)}
                  shirtNumber={player.shirt_number}
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
