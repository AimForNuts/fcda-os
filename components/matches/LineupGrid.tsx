import type { PlayerPublic } from '@/types'

type Props = {
  teamA: PlayerPublic[]
  teamB: PlayerPublic[]
  unassigned: PlayerPublic[]
}

function PlayerRow({ player }: { player: PlayerPublic }) {
  return (
    <div className="flex items-center gap-2 text-sm py-1.5 border-b border-border/50 last:border-0">
      {player.shirt_number != null && (
        <span className="w-5 text-right text-muted-foreground text-xs tabular-nums shrink-0">
          {player.shirt_number}
        </span>
      )}
      <span>{player.display_name}</span>
    </div>
  )
}

export function LineupGrid({ teamA, teamB, unassigned }: Props) {
  if (teamA.length === 0 && teamB.length === 0 && unassigned.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Convocatória não disponível.
      </p>
    )
  }

  if (teamA.length > 0 || teamB.length > 0) {
    return (
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-fcda-navy mb-2">
            Equipa Branca
          </h3>
          {teamA.map((p) => (
            <PlayerRow key={p.id} player={p} />
          ))}
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-fcda-navy mb-2">
            Equipa Preta
          </h3>
          {teamB.map((p) => (
            <PlayerRow key={p.id} player={p} />
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
        <PlayerRow key={p.id} player={p} />
      ))}
    </div>
  )
}
