'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { GameTypeBadge } from '@/components/matches/GameTypeBadge'
import { getTeamPresentation } from '@/lib/games/team-presentation'
import {
  matchTeam,
  resultClassName,
  resultForPlayer,
  resultLabel,
  type PlayerMatchHistoryRow,
} from '@/lib/players/player-match-history'
import { cn } from '@/lib/utils'

type GameTypeFilter = 'all' | 'competitive' | 'friendly'

const FILTERS: { value: GameTypeFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'competitive', label: 'Competitivo' },
  { value: 'friendly', label: 'Amigável' },
]

function formatHistoryDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function PlayerMatchHistory({ matches }: { matches: PlayerMatchHistoryRow[] }) {
  const [filter, setFilter] = useState<GameTypeFilter>('all')

  const filtered = useMemo(() => {
    if (filter === 'all') return matches
    if (filter === 'competitive') return matches.filter((m) => m.counts_for_stats)
    return matches.filter((m) => !m.counts_for_stats)
  }, [matches, filter])

  const counts = useMemo(() => {
    const competitive = matches.filter((m) => m.counts_for_stats).length
    return {
      all: matches.length,
      competitive,
      friendly: matches.length - competitive,
    }
  }, [matches])

  return (
    <section className="bg-card p-4 shadow-sm shadow-sm md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
        <h3 className="text-xl font-black text-foreground md:text-2xl">Histórico de jogos</h3>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Filtrar por tipo de jogo"
        >
          {FILTERS.map(({ value, label }) => {
            const count =
              value === 'all'
                ? counts.all
                : value === 'competitive'
                  ? counts.competitive
                  : counts.friendly
            const active = filter === value

            return (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                aria-pressed={active}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-wide transition-colors sm:text-xs',
                  active
                    ? 'border-fcda-gold bg-fcda-gold/15 text-foreground'
                    : 'border-border bg-background text-muted-foreground hover:border-fcda-gold/50 hover:text-foreground',
                )}
              >
                {label}
                <span className="tabular-nums text-muted-foreground">({count})</span>
              </button>
            )
          })}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-md border border-border">
          {filtered.map((match, index) => {
            const team = matchTeam(match.team)
            const teamPresentation = team ? getTeamPresentation(team) : null
            const result = resultForPlayer(match)

            return (
              <Link
                key={match.game_id}
                href={`/matches/${match.game_id}`}
                title="Ver ficha de jogo"
                className={cn(
                  'flex min-h-11 items-center gap-2 border-b border-border px-2 py-1.5 text-left transition-colors last:border-b-0 hover:bg-muted/40 sm:min-h-0 sm:gap-3 sm:px-3 sm:py-2',
                  index % 2 === 1 && 'bg-muted/30',
                )}
              >
                <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
                  <Image
                    src={getTeamPresentation('a').imageSrc}
                    alt=""
                    width={40}
                    height={55}
                    className="h-6 w-auto shrink-0 object-contain opacity-90 sm:h-7"
                    aria-hidden
                  />
                  <span className="text-base font-black tabular-nums sm:text-lg">
                    {match.score_a != null && match.score_b != null
                      ? `${match.score_a}-${match.score_b}`
                      : '—'}
                  </span>
                  <Image
                    src={getTeamPresentation('b').imageSrc}
                    alt=""
                    width={40}
                    height={55}
                    className="h-6 w-auto shrink-0 object-contain opacity-90 sm:h-7"
                    aria-hidden
                  />
                </div>
                <span className="block min-w-0 flex-1 truncate text-[11px] text-muted-foreground sm:text-xs">
                  <span>{formatHistoryDate(match.date)}</span>
                  <span className="mx-1 text-muted-foreground/50 sm:mx-1.5" aria-hidden>
                    ·
                  </span>
                  <span>{match.location}</span>
                </span>
                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                  <GameTypeBadge competitive={match.counts_for_stats} />
                  {teamPresentation ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:gap-1.5 sm:text-[11px] sm:tracking-[0.14em]">
                      <Image
                        src={teamPresentation.imageSrc}
                        alt=""
                        width={28}
                        height={38}
                        className="h-5 w-auto object-contain opacity-90 sm:h-6"
                        aria-hidden
                      />
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      <span
                        aria-hidden
                        className="text-sm font-black leading-none text-muted-foreground/50 sm:text-base"
                      >
                        —
                      </span>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 border-l border-border pl-2 sm:gap-1.5 sm:pl-3">
                    <span
                      className={cn(
                        'text-[11px] font-black uppercase tracking-wide sm:text-xs',
                        resultClassName(result),
                      )}
                    >
                      {resultLabel(result)}
                    </span>
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Sem jogos neste filtro.</p>
      )}
    </section>
  )
}
