import Image from 'next/image'
import { getTeamPresentation, type MatchTeam } from '@/lib/games/team-presentation'
import { cn } from '@/lib/utils'

type Props = {
  team: MatchTeam
  className?: string
}

export function TeamHeader({ team, className }: Props) {
  const presentation = getTeamPresentation(team)

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl border px-3 py-2.5',
        presentation.headerSurfaceClassName,
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Image
          src={presentation.imageSrc}
          alt={presentation.imageAlt}
          width={32}
          height={44}
          className="h-7 w-auto shrink-0 object-contain drop-shadow-sm sm:h-8"
        />
        <div className="min-w-0">
          <p className={cn('truncate text-sm font-semibold', presentation.headerLabelClassName)}>
            {presentation.label}
          </p>
        </div>
      </div>
    </div>
  )
}
