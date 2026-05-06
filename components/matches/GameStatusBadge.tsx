'use client'

import { Ban, CheckCircle2, Clock3 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { Game } from '@/types'

const STATUS_META: Record<
  Game['status'],
  {
    className: string
    icon: typeof Clock3
  }
> = {
  scheduled: {
    className: 'border-sky-700/20 bg-sky-50 text-sky-700',
    icon: Clock3,
  },
  finished: {
    className: 'border-fcda-gold/70 bg-fcda-gold text-fcda-navy',
    icon: CheckCircle2,
  },
  cancelled: {
    className: 'border-red-700/20 bg-red-50 text-red-700',
    icon: Ban,
  },
}

type Props = {
  status: Game['status']
  className?: string
  compact?: boolean
}

export function GameStatusBadge({ status, className, compact = false }: Props) {
  const { t } = useTranslation()
  const meta = STATUS_META[status]
  const Icon = meta.icon
  const label = t(`matches.status.${status}`)
  const ariaPhrase = t('matches.statusAria', { status: label.toLowerCase() })

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase leading-none',
        meta.className,
        className
      )}
      aria-label={ariaPhrase}
      title={ariaPhrase}
    >
      <Icon className="size-3" aria-hidden />
      {compact ? <span className="sr-only">{label}</span> : <span>{label}</span>}
    </span>
  )
}
