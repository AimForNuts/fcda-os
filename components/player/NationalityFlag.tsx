import { getNationalityFlagImageUrl, getNationalityLabel } from '@/lib/nationality'
import { cn } from '@/lib/utils'

type NationalityFlagProps = {
  nationality: string | null | undefined
  className?: string
}

export function NationalityFlag({ nationality, className }: NationalityFlagProps) {
  const label = getNationalityLabel(nationality)

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={getNationalityFlagImageUrl(nationality)}
      alt={label}
      title={label}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className={cn(
        'inline-block h-4 w-6 shrink-0 rounded-[1px] object-cover align-middle shadow-[0_0_0_1px_rgba(15,23,42,0.08)]',
        className
      )}
    />
  )
}
