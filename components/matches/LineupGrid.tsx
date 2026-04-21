import type { PlayerPublic } from '@/types'
import { PlayerIdentity } from '@/components/player/PlayerIdentity'
import { TeamHeader } from '@/components/matches/TeamHeader'

type LineupPlayer = PlayerPublic & { avatar_url?: string | null }

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
    </div>
  )
}

export function LineupGrid({ teamA, teamB, unassigned, isApproved }: Props) {
  if (teamA.length === 0 && teamB.length === 0 && unassigned.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Convocatória não disponível.
      </p>
    )
  }

  if (teamA.length > 0 || teamB.length > 0) {
    return (
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-3">
          <TeamHeader team="a" count={teamA.length} />
          {teamA.map((p) => (
            <PlayerRow key={p.id} player={p} isApproved={isApproved} />
          ))}
        </div>
        <div className="space-y-3">
          <TeamHeader team="b" count={teamB.length} />
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
        Convocados
      </h3>
      {unassigned.map((p) => (
        <PlayerRow key={p.id} player={p} isApproved={isApproved} />
      ))}
    </div>
  )
}
