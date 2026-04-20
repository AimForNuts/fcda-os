import { cn } from '@/lib/utils'

export type ChipStatus = 'matched' | 'ambiguous' | 'unmatched'

type PlayerChipProps = {
  name: string
  status: ChipStatus
}

const STATUS_STYLES: Record<ChipStatus, string> = {
  matched: 'bg-green-100 text-green-800 border-green-200',
  ambiguous: 'bg-amber-100 text-amber-800 border-amber-200',
  unmatched: 'bg-red-100 text-red-800 border-red-200',
}

const DOT_STYLES: Record<ChipStatus, string> = {
  matched: 'bg-green-500',
  ambiguous: 'bg-amber-500',
  unmatched: 'bg-red-500',
}

export function PlayerChip({ name, status }: PlayerChipProps) {
  return (
    <span
      data-testid="player-chip"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-medium',
        STATUS_STYLES[status],
      )}
    >
      <span
        className={cn('h-2 w-2 flex-shrink-0 rounded-full', DOT_STYLES[status])}
        aria-hidden="true"
      />
      {name}
    </span>
  )
}
