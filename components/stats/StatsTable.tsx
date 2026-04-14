import type { PlayerPublic } from '@/types'

type Props = {
  players: PlayerPublic[]
  isAnonymised: boolean
}

export function StatsTable({ players, isAnonymised }: Props) {
  if (players.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Sem dados de jogadores.
      </p>
    )
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {isAnonymised && (
        <div className="bg-fcda-ice px-4 py-2 text-xs text-fcda-navy/70 border-b border-border">
          Inicia sessão para ver os nomes dos jogadores.
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-fcda-navy text-white text-xs uppercase tracking-wide">
            <th className="px-4 py-2.5 text-left font-semibold">Jogador</th>
            <th className="px-4 py-2.5 text-right font-semibold">Nota</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p, i) => (
            <tr
              key={p.id}
              className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}
            >
              <td className="px-4 py-2.5">
                {p.shirt_number != null && (
                  <span className="text-muted-foreground text-xs mr-2 tabular-nums">
                    #{p.shirt_number}
                  </span>
                )}
                {p.display_name}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                {p.current_rating != null
                  ? p.current_rating.toFixed(1)
                  : '–'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
