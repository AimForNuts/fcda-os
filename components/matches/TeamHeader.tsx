import Image from 'next/image'
import { getTeamPresentation, type MatchTeam } from '@/lib/games/team-presentation'
import { cn } from '@/lib/utils'

type Props = {
  team: MatchTeam
  className?: string
  variant?: 'surface' | 'plain'
}

export function TeamHeader({ team, className, variant = 'surface' }: Props) {
  const presentation = getTeamPresentation(team)

  if (variant === 'plain') {
    return (
      <div className={cn('flex h-12 min-w-0 items-center gap-3', className)}>
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
