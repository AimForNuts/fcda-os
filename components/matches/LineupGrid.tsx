'use client'

import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import type { PlayerPublic } from '@/types'
import { PlayerIdentity } from '@/components/player/PlayerIdentity'
import { getTeamPresentation, type MatchTeam } from '@/lib/games/team-presentation'
import { cn } from '@/lib/utils'

type LineupPlayer = PlayerPublic & { avatar_url?: string | null; is_captain?: boolean }

type Props = {
  teamA: LineupPlayer[]
  teamB: LineupPlayer[]
  unassigned: LineupPlayer[]
  isApproved?: boolean
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
  return (
    <div className="grid min-h-10 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border/70 py-2.5 text-sm last:border-b-0">
      <PlayerIdentity
        name={player.display_name}
        shirtNumber={player.shirt_number}
        shirtNumberPlacement="after-name"
        href={isApproved ? `/players/${player.id}` : undefined}
        avatarUrl={player.avatar_url ?? null}
        showAvatar={!!isApproved}
        avatarSize="sm"
        className={cn('min-w-0 font-medium', muted && 'text-muted-foreground')}
        nameClassName="min-w-0"
      />
      {player.is_captain && (
        <span className="rounded bg-fcda-gold/40 px-1.5 py-0.5 text-[10px] font-bold uppercase text-fcda-navy">
          C
        </span>
      )}
    </div>
  )
}

function TeamLineupHeader({ team }: { team: MatchTeam }) {
  const presentation = getTeamPresentation(team)

  return (
    <div className="flex h-12 min-w-0 items-center gap-3">
      <Image
        src={presentation.imageSrc}
        alt={presentation.imageAlt}
        width={36}
        height={50}
        className="h-10 w-auto shrink-0 object-contain drop-shadow-sm"
      />
      <h3 className="min-w-0 truncate text-sm font-black text-foreground">
        {presentation.label}
      </h3>
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
      <TeamLineupHeader team={team} />
      <div className="border-y border-border">
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
      <div className="border-y border-border">
        {unassigned.map((p) => (
          <PlayerRow key={p.id} player={p} isApproved={isApproved} muted />
        ))}
      </div>
    </div>
  )
}
