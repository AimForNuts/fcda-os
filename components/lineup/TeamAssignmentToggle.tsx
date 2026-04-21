import Image from 'next/image'
import { getTeamPresentation, type MatchTeam } from '@/lib/games/team-presentation'
import { cn } from '@/lib/utils'

type TeamOption = MatchTeam | null

type Props = {
  value: TeamOption
  onChange: (team: TeamOption) => void
  noTeamLabel: string
  className?: string
}

const TEAM_OPTIONS: TeamOption[] = ['a', 'b', null]

export function TeamAssignmentToggle({ value, onChange, noTeamLabel, className }: Props) {
  return (
    <div className={cn('flex items-center gap-1.5', className)} role="group" aria-label="Team assignment">
      {TEAM_OPTIONS.map((team) => {
        const isSelected = value === team

        if (team === null) {
          return (
            <button
              key="none"
              type="button"
              aria-label={noTeamLabel}
              aria-pressed={isSelected}
              onClick={() => onChange(null)}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-semibold transition-colors',
                isSelected
                  ? 'border-fcda-navy bg-fcda-navy text-white'
                  : 'border-fcda-navy/20 bg-white text-fcda-navy hover:border-fcda-navy/50',
              )}
            >
              —
            </button>
          )
        }

        const presentation = getTeamPresentation(team)

        return (
          <button
            key={team}
            type="button"
            aria-label={presentation.label}
            aria-pressed={isSelected}
            onClick={() => onChange(team)}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl border p-1 transition-colors',
              isSelected
                ? 'border-fcda-navy bg-fcda-ice/60 shadow-sm'
                : 'border-fcda-navy/20 bg-white hover:border-fcda-navy/50 hover:bg-fcda-ice/25',
            )}
          >
            <Image
              src={presentation.imageSrc}
              alt=""
              width={28}
              height={38}
              className="h-8 w-auto object-contain"
            />
          </button>
        )
      })}
    </div>
  )
}
