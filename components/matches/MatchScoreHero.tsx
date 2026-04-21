import Image from 'next/image'
import { getTeamPresentation, type MatchTeam } from '@/lib/games/team-presentation'
import { cn } from '@/lib/utils'

type TeamScorePanelProps = {
  team: MatchTeam
  score: number | null
}

function TeamScorePanel({ team, score }: TeamScorePanelProps) {
  const presentation = getTeamPresentation(team)

  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-[1.5rem] border p-4',
        presentation.scorePanelClassName,
      )}
    >
      <Image
        src={presentation.imageSrc}
        alt={presentation.imageAlt}
        width={64}
        height={88}
        className="h-14 w-auto shrink-0 object-contain sm:h-16"
      />
      <div className="min-w-0">
        <p className={cn('text-xs font-semibold uppercase tracking-[0.2em]', presentation.scoreLabelClassName)}>
          {presentation.label}
        </p>
      </div>
      <span className={cn('ml-auto text-5xl font-black tabular-nums sm:text-6xl', presentation.scoreValueClassName)}>
        {score ?? '-'}
      </span>
    </div>
  )
}

type Props = {
  scoreA: number | null
  scoreB: number | null
}

export function MatchScoreHero({ scoreA, scoreB }: Props) {
  return (
    <div className="rounded-[2rem] bg-fcda-navy p-4 text-white shadow-lg shadow-fcda-navy/10 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-stretch sm:gap-4">
        <TeamScorePanel team="a" score={scoreA} />
        <div className="flex items-center justify-center">
          <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-fcda-gold">
            VS
          </span>
        </div>
        <TeamScorePanel team="b" score={scoreB} />
      </div>
    </div>
  )
}
