import { Ban, CheckCircle2, Clock3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Game } from '@/types'

const STATUS_META: Record<
  Game['status'],
  {
    label: string
    className: string
    icon: typeof Clock3
  }
> = {
  scheduled: {
    label: 'Agendado',
    className: 'border-sky-700/20 bg-sky-50 text-sky-700',
    icon: Clock3,
  },
  finished: {
    label: 'Concluído',
    className: 'border-fcda-gold/70 bg-fcda-gold text-fcda-navy',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelado',
    className: 'border-red-700/20 bg-red-50 text-red-700',
    icon: Ban,
  },
}

type Props = {
  status: Game['status']
  className?: string
  compact?: boolean
}

export function getGameStatusLabel(status: Game['status']) {
  return STATUS_META[status].label
}

export function GameStatusBadge({ status, className, compact = false }: Props) {
  const meta = STATUS_META[status]
  const Icon = meta.icon

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase leading-none',
        meta.className,
        className
      )}
      aria-label={`Jogo ${meta.label.toLowerCase()}`}
      title={`Jogo ${meta.label.toLowerCase()}`}
    >
      <Icon className="size-3" aria-hidden />
      {compact ? <span className="sr-only">{meta.label}</span> : <span>{meta.label}</span>}
    </span>
  )
}
