'use client'

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function MatchesDateFilter({ className }: { className?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''
  const hasFilter = Boolean(from || to)

  const pushParams = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString())
      mutate(params)
      const q = params.toString()
      router.push(q ? `${pathname}?${q}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  return (
    <div
      className={cn(
        'flex shrink-0 flex-nowrap items-center gap-1.5',
        className,
      )}
      role="search"
      aria-label="Filtrar jogos por data"
    >
      <Calendar className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <Input
        aria-label="Data inicial"
        type="date"
        value={from}
        onChange={(e) => {
          const v = e.target.value
          pushParams((p) => {
            if (v) p.set('from', v)
            else p.delete('from')
          })
        }}
        className="h-8 w-full min-w-0 shrink px-2 text-[13px] sm:w-36"
      />
      <span className="shrink-0 select-none text-muted-foreground" aria-hidden>
        —
      </span>
      <Input
        aria-label="Data final"
        type="date"
        value={to}
        onChange={(e) => {
          const v = e.target.value
          pushParams((p) => {
            if (v) p.set('to', v)
            else p.delete('to')
          })
        }}
        className="h-8 w-full min-w-0 shrink px-2 text-[13px] sm:w-36"
      />
      {hasFilter ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 px-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => {
            pushParams((p) => {
              p.delete('from')
              p.delete('to')
            })
          }}
        >
          Limpar
        </Button>
      ) : null}
    </div>
  )
}
