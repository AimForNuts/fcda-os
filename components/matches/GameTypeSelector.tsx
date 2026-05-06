'use client'

import { CompetitiveGameIcon, FriendlyGameIcon } from '@/components/matches/game-type-icons'
import { cn } from '@/lib/utils'

type Props = {
  value: boolean
  disabled?: boolean
  labels: {
    competitive: string
    friendly: string
    aria: string
    competitiveDescription: string
    friendlyDescription: string
  }
  onChange: (value: boolean) => void
}

export function GameTypeSelector({ value, disabled, labels, onChange }: Props) {
  const options = [
    {
      value: true,
      label: labels.competitive,
      icon: CompetitiveGameIcon,
      description: labels.competitiveDescription,
    },
    {
      value: false,
      label: labels.friendly,
      icon: FriendlyGameIcon,
      description: labels.friendlyDescription,
    },
  ]

  return (
    <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={labels.aria}>
      {options.map((option) => {
        const active = value === option.value
        const Icon = option.icon

        return (
          <button
            key={option.label}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            className={cn(
              'flex min-h-20 min-w-0 items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors',
              active
                ? 'border-fcda-blue bg-fcda-blue/10 text-fcda-blue ring-1 ring-fcda-blue/20'
                : 'border-border bg-background text-foreground hover:bg-muted/60',
              disabled && 'cursor-not-allowed opacity-60',
            )}
            onClick={() => onChange(option.value)}
          >
            <span
              className={cn(
                'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border',
                active ? 'border-fcda-blue/25 bg-white text-fcda-blue' : 'border-border bg-muted text-muted-foreground',
              )}
            >
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-black uppercase tracking-normal">{option.label}</span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">{option.description}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
