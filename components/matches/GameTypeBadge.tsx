'use client'

import { useTranslation } from 'react-i18next'
import { CompetitiveGameIcon, FriendlyGameIcon } from '@/components/matches/game-type-icons'
import { cn } from '@/lib/utils'

type Props = {
  competitive: boolean
  className?: string
  compact?: boolean
  /** Solid light pills for dark backgrounds (e.g. navy homepage carousel). */
  variant?: 'default' | 'onDark'
}

export function GameTypeBadge({
  competitive,
  className,
  compact = false,
  variant = 'default',
}: Props) {
  const { t } = useTranslation()
  const Icon = competitive ? CompetitiveGameIcon : FriendlyGameIcon
  const label = competitive
    ? t('matches.gameType.competitive')
    : t('matches.gameType.friendly')

  const toneClasses =
    variant === 'onDark'
      ? competitive
        ? 'border-white/40 bg-white text-fcda-navy'
        : 'border-emerald-400/55 bg-emerald-50 text-emerald-900'
      : competitive
        ? 'border-fcda-blue/20 bg-fcda-blue/10 text-fcda-blue'
        : 'border-emerald-700/20 bg-emerald-50 text-emerald-700'

  const ariaPhrase = t('matches.gameTypeAria', { type: label.toLowerCase() })

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border text-[11px] font-bold uppercase leading-none',
        compact ? 'gap-0 p-1' : 'gap-1 px-2 py-0.5',
        toneClasses,
        className
      )}
      aria-label={ariaPhrase}
      title={ariaPhrase}
    >
      <Icon className={compact ? 'size-3.5' : 'size-3'} aria-hidden />
      {!compact ? <span>{label}</span> : null}
    </span>
  )
}
