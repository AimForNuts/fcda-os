'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import type { PlayerPublic } from '@/types'
import { NationalityFlag } from '@/components/player/NationalityFlag'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { TeamHeader } from '@/components/matches/TeamHeader'
import type { MatchTeam } from '@/lib/games/team-presentation'
import { cn } from '@/lib/utils'

type LineupPlayer = PlayerPublic & { avatar_url?: string | null; is_captain?: boolean }

type Props = {
  teamA: LineupPlayer[]
  teamB: LineupPlayer[]
  unassigned: LineupPlayer[]
  isApproved?: boolean
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase()
}

function PlayerRow({
  player,
  isApproved,
  muted = false,
}: {
  player: LineupPlayer
  isApproved?: boolean
  muted?: boolean
}) {
  const name = (
    <span className={cn('min-w-0 truncate', muted && 'text-muted-foreground')}>
      {player.display_name}
    </span>
  )
  const nameNode = isApproved ? (
    <Link
      href={`/players/${player.id}`}
      className="min-w-0 truncate hover:underline"
    >
      {name}
    </Link>
  ) : (
    name
  )

  return (
    <div
      className={cn(
        'grid min-h-9 grid-cols-[2.25rem_1.75rem_2rem_minmax(0,1fr)] items-center gap-2 py-1.5 text-[1.05rem] leading-tight sm:text-lg',
        muted && 'text-muted-foreground'
      )}
    >
      <span className="text-right font-medium tabular-nums text-slate-500">
        {player.shirt_number ?? '–'}
      </span>
      <Avatar size="sm" className="size-7">
        {isApproved && player.avatar_url ? (
          <AvatarImage src={player.avatar_url} alt="" aria-hidden />
        ) : null}
        <AvatarFallback className="bg-muted text-[0.65rem] font-semibold text-slate-500">
          {getInitials(player.display_name)}
        </AvatarFallback>
      </Avatar>
      <NationalityFlag nationality={player.nationality} className="h-4 w-6" />
      <span className="flex min-w-0 items-baseline gap-1.5 font-normal text-slate-700">
        {nameNode}
        {player.is_captain ? (
          <span className="shrink-0 text-current">(C)</span>
        ) : null}
      </span>
    </div>
  )
}

function TeamLineupColumn({
  team,
  players,
  isApproved,
}: {
  team: MatchTeam
  players: LineupPlayer[]
  isApproved?: boolean
}) {
  return (
    <section className="min-w-0 space-y-3">
      <TeamHeader team={team} variant="plain" />
      <div className="space-y-0.5">
        {players.length > 0 ? (
          players.map((p) => (
            <PlayerRow key={p.id} player={p} isApproved={isApproved} />
          ))
        ) : (
          <p className="py-4 text-sm text-muted-foreground">
            Sem jogadores atribuídos.
          </p>
        )}
      </div>
    </section>
  )
}

export function LineupGrid({ teamA, teamB, unassigned, isApproved }: Props) {
  const { t } = useTranslation()

  if (teamA.length === 0 && teamB.length === 0 && unassigned.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('matches.noLineup')}
      </p>
    )
  }

  if (teamA.length > 0 || teamB.length > 0) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <TeamLineupColumn team="a" players={teamA} isApproved={isApproved} />
        <TeamLineupColumn team="b" players={teamB} isApproved={isApproved} />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-black text-foreground">
        {t('matches.lineup')}
      </h3>
      <div className="space-y-0.5">
        {unassigned.map((p) => (
          <PlayerRow key={p.id} player={p} isApproved={isApproved} muted />
        ))}
      </div>
    </div>
  )
}
