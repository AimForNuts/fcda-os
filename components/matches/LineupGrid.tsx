'use client'

import { useTranslation } from 'react-i18next'
import type { PlayerPublic } from '@/types'
import { PlayerIdentity } from '@/components/player/PlayerIdentity'
import { TeamHeader } from '@/components/matches/TeamHeader'

type LineupPlayer = PlayerPublic & { avatar_url?: string | null; is_captain?: boolean }

type Props = {
  teamA: LineupPlayer[]
  teamB: LineupPlayer[]
  unassigned: LineupPlayer[]
  isApproved?: boolean
}

function PlayerRow({ player, isApproved }: { player: LineupPlayer; isApproved?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm py-1.5 border-b border-border/50 last:border-0">
      <PlayerIdentity
        name={player.display_name}
        shirtNumber={player.shirt_number}
        href={isApproved ? `/players/${player.id}` : undefined}
        avatarUrl={player.avatar_url ?? null}
        showAvatar={!!isApproved}
        avatarSize="sm"
      />
      {player.is_captain && (
        <span className="ml-auto rounded bg-fcda-gold/40 px-1.5 py-0.5 text-[10px] font-bold uppercase text-fcda-navy">
          C
        </span>
      )}
    </div>
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
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-3">
          <TeamHeader team="a" />
          {teamA.map((p) => (
            <PlayerRow key={p.id} player={p} isApproved={isApproved} />
          ))}
        </div>
        <div className="space-y-3">
          <TeamHeader team="b" />
          {teamB.map((p) => (
            <PlayerRow key={p.id} player={p} isApproved={isApproved} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-fcda-navy mb-2">
        {t('matches.lineup')}
      </h3>
      {unassigned.map((p) => (
        <PlayerRow key={p.id} player={p} isApproved={isApproved} />
      ))}
    </div>
  )
}
