'use client'

import { useCallback, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { CheckCircle2, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react'
import { formatScheduleDate } from '@/lib/games/format-schedule-date'
import { getTeamPresentation } from '@/lib/games/team-presentation'
import { cn } from '@/lib/utils'
import type { Game } from '@/types'

const teamA = getTeamPresentation('a')
const teamB = getTeamPresentation('b')

function HomeGameCard({
  game,
  className,
  commentCount = 0,
}: {
  game: Game
  className?: string
  commentCount?: number
}) {
  const formatted = formatScheduleDate(game.date)
  const score =
    game.score_a != null && game.score_b != null
      ? `${game.score_a} - ${game.score_b}`
      : formatted.time

  return (
    <article className={cn('min-w-0', className)} data-carousel-card>
      <div className="relative overflow-hidden rounded-xl bg-background shadow-sm ring-1 ring-fcda-gold/60">
        <div className="relative z-10 h-1 bg-fcda-gold" />
        <div className="relative z-10 flex items-start justify-between gap-3 px-4 pt-4">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src="/crest.png"
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 shrink-0 object-contain drop-shadow-sm"
              aria-hidden
            />
            <div className="min-w-0">
              <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-fcda-gold px-2 py-0.5 text-[11px] font-bold uppercase text-fcda-navy ring-1 ring-fcda-gold/70">
                <CheckCircle2 size={12} aria-hidden />
                Concluído
              </div>
              <p className="truncate text-xs text-muted-foreground">{game.location}</p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="flex items-start justify-end gap-2">
              <span
                className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground"
                aria-label={`${commentCount} comentários`}
                title={`${commentCount} comentários`}
              >
                <MessageCircle size={14} aria-hidden />
                <span className="tabular-nums">{commentCount}</span>
              </span>
              <div>
                <p className="text-sm font-bold text-fcda-navy">{formatted.dayMonth}</p>
                <p className="text-xs font-medium text-muted-foreground">{formatted.weekday}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-8">
          <div className="min-w-0 text-center">
            <Image
              src={teamA.imageSrc}
              alt={teamA.imageAlt}
              width={48}
              height={66}
              className="mx-auto h-12 w-auto object-contain drop-shadow-sm"
            />
            <p className="mt-3 truncate text-sm font-semibold text-fcda-navy">{teamA.label}</p>
          </div>

          <div className="flex min-w-16 items-center justify-center rounded-full border border-fcda-gold bg-fcda-gold px-3 py-1 text-sm font-bold text-fcda-navy tabular-nums shadow-sm">
            {score}
          </div>

          <div className="min-w-0 text-center">
            <Image
              src={teamB.imageSrc}
              alt={teamB.imageAlt}
              width={48}
              height={66}
              className="mx-auto h-12 w-auto object-contain drop-shadow-sm"
            />
            <p className="mt-3 truncate text-sm font-semibold text-fcda-navy">{teamB.label}</p>
          </div>
        </div>

        <Link
          href={`/matches/${game.id}`}
          className="relative z-10 block border-t border-border/70 px-4 py-3 text-center text-sm font-bold text-fcda-navy transition-colors hover:bg-muted/50"
        >
          Detalhes
        </Link>
      </div>
    </article>
  )
}

export function CompletedGamesCarousel({
  games,
  commentCounts = {},
}: {
  games: Game[]
  commentCounts?: Record<string, number>
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const updateActiveIndex = useCallback(() => {
    const scroller = scrollerRef.current

    if (!scroller) {
      return
    }

    const cards = Array.from(
      scroller.querySelectorAll<HTMLElement>('[data-carousel-card]'),
    )

    if (cards.length === 0) {
      setActiveIndex(0)
      return
    }

    const closest = cards.reduce(
      (best, card, index) => {
        const distance = Math.abs(card.offsetLeft - scroller.scrollLeft)

        return distance < best.distance ? { index, distance } : best
      },
      { index: 0, distance: Number.POSITIVE_INFINITY },
    )

    setActiveIndex(closest.index)
  }, [])

  const scrollToIndex = useCallback((index: number) => {
    const scroller = scrollerRef.current
    const cards = scroller
      ? Array.from(scroller.querySelectorAll<HTMLElement>('[data-carousel-card]'))
      : []
    const nextIndex = Math.min(Math.max(index, 0), cards.length - 1)
    const nextCard = cards[nextIndex]

    nextCard?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'start',
    })
  }, [])

  const selectedIndex = Math.min(activeIndex, Math.max(games.length - 1, 0))
  const canGoBack = selectedIndex > 0
  const canGoForward = selectedIndex < games.length - 1

  return (
    <div>
      <div
        ref={scrollerRef}
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 touch-pan-x [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:snap-none md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0 md:pb-0"
        aria-label="Jogos concluídos"
        onScroll={updateActiveIndex}
      >
        {games.map((game) => (
          <HomeGameCard
            key={game.id}
            game={game}
            commentCount={commentCounts[game.id] ?? 0}
            className="w-[calc(100vw-3rem)] max-w-sm shrink-0 snap-start md:w-auto md:max-w-none md:shrink"
          />
        ))}
      </div>

      {games.length > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-3 md:hidden">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-fcda-navy shadow-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Jogo concluído anterior"
            disabled={!canGoBack}
            onClick={() => scrollToIndex(selectedIndex - 1)}
          >
            <ChevronLeft size={18} aria-hidden />
          </button>

          <div className="flex items-center gap-1.5" aria-hidden>
            {games.map((game, index) => (
              <span
                key={game.id}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  index === selectedIndex
                    ? 'w-5 bg-fcda-navy'
                    : 'w-1.5 bg-fcda-navy/30',
                )}
              />
            ))}
          </div>

          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-fcda-navy shadow-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Próximo jogo concluído"
            disabled={!canGoForward}
            onClick={() => scrollToIndex(selectedIndex + 1)}
          >
            <ChevronRight size={18} aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  )
}
