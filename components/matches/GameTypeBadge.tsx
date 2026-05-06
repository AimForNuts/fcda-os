import { Handshake, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  competitive: boolean
  className?: string
  compact?: boolean
}

export function GameTypeBadge({ competitive, className, compact = false }: Props) {
  const Icon = competitive ? ShieldCheck : Handshake
  const label = competitive ? 'Competitivo' : 'Amigável'

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase leading-none',
        competitive
          ? 'border-fcda-blue/20 bg-fcda-blue/10 text-fcda-blue'
          : 'border-emerald-700/20 bg-emerald-50 text-emerald-700',
        className
      )}
      aria-label={`Jogo ${label.toLowerCase()}`}
      title={`Jogo ${label.toLowerCase()}`}
    >
      <Icon className="size-3" aria-hidden />
      {compact ? <span className="sr-only">{label}</span> : <span>{label}</span>}
    </span>
  )
}
