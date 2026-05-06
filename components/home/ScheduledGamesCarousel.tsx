'use client'

import { useCallback, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react'
import { formatScheduleDate } from '@/lib/games/format-schedule-date'
import { getTeamPresentation } from '@/lib/games/team-presentation'
import { GameStatusBadge } from '@/components/matches/GameStatusBadge'
import { GameTypeBadge } from '@/components/matches/GameTypeBadge'
import { WeatherSummary } from '@/components/matches/WeatherSummary'
import { cn } from '@/lib/utils'
import type { MatchWeather } from '@/lib/weather/open-meteo'
import type { Game } from '@/types'

const teamA = getTeamPresentation('a')
const teamB = getTeamPresentation('b')

function ScheduledGameCard({
  game,
  className,
  commentCount = 0,
  weather,
  showNextMatchLabel = false,
}: {
  game: Game
  className?: string
  commentCount?: number
  weather?: MatchWeather | null
  showNextMatchLabel?: boolean
}) {
  const formatted = formatScheduleDate(game.date)

  return (
    <article className={cn('min-w-0', className)} data-carousel-card>
      <div className="relative overflow-hidden rounded-xl bg-fcda-navy text-white shadow-sm">
        <Image
          src="/crest.png"
          alt=""
          width={320}
          height={320}
          className="pointer-events-none absolute right-[-3rem] top-1/2 z-0 h-80 w-80 -translate-y-1/2 object-contain opacity-20"
          aria-hidden
        />
        <span
          className="absolute right-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white ring-1 ring-white/15"
          aria-label={`${commentCount} comentários`}
          title={`${commentCount} comentários`}
        >
          <MessageCircle size={14} aria-hidden />
          <span className="tabular-nums">{commentCount}</span>
        </span>
        <div className="relative z-10 grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center">
          <div className="min-w-0 pr-16">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <GameStatusBadge status={game.status} />
              <GameTypeBadge competitive={game.counts_for_stats} variant="onDark" />
            </div>
            <p
              className={cn(
                'text-sm font-medium text-white/70',
                !showNextMatchLabel && 'invisible pointer-events-none select-none',
              )}
              aria-hidden={!showNextMatchLabel}
            >
              Próximo jogo
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">
              {formatted.dayMonth}{' '}
              <span className="font-medium text-white/65">{formatted.weekday}</span>
            </h2>
            <p className="mt-2 text-sm text-white/75">
              {game.location} · {formatted.time}
            </p>
            <WeatherSummary weather={weather} className="mt-2" />
          </div>

          <div className="mx-auto grid w-full max-w-sm grid-cols-[1fr_auto_1fr] items-center gap-4 justify-self-center md:col-start-2">
            <div className="min-w-0 text-center">
              <Image
                src={teamA.imageSrc}
                alt={teamA.imageAlt}
                width={56}
                height={77}
                className="mx-auto h-14 w-auto object-contain drop-shadow-sm"
              />
              <p className="mt-3 truncate text-sm font-semibold">{teamA.label}</p>
            </div>

            <div className="rounded-full bg-white px-4 py-1.5 text-sm font-bold text-fcda-navy shadow-sm">
              VS
            </div>

            <div className="min-w-0 text-center">
              <Image
                src={teamB.imageSrc}
                alt={teamB.imageAlt}
                width={56}
                height={77}
                className="mx-auto h-14 w-auto object-contain drop-shadow-sm"
              />
              <p className="mt-3 truncate text-sm font-semibold">{teamB.label}</p>
            </div>
          </div>
        </div>

        <Link
          href={`/matches/${game.id}`}
          className="relative z-10 block border-t border-white/15 bg-white px-4 py-3 text-center text-sm font-bold text-fcda-navy transition-colors hover:bg-white/90"
        >
          Detalhes
        </Link>
      </div>
    </article>
  )
}

export function ScheduledGamesCarousel({
  games,
  commentCounts = {},
  weatherByGameId = {},
}: {
  games: Game[]
  commentCounts?: Record<string, number>
  weatherByGameId?: Record<string, MatchWeather | null>
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
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 touch-pan-x [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:px-0"
        aria-label="Jogos agendados"
        onScroll={updateActiveIndex}
      >
        {games.map((game, index) => (
          <ScheduledGameCard
            key={game.id}
            game={game}
            commentCount={commentCounts[game.id] ?? 0}
            weather={weatherByGameId[game.id]}
            showNextMatchLabel={index === 0}
            className="min-w-0 shrink-0 basis-full snap-start"
          />
        ))}
      </div>

      {games.length > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Jogo agendado anterior"
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
                    ? 'w-5 bg-foreground'
                    : 'w-1.5 bg-foreground/35',
                )}
              />
            ))}
          </div>

          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Próximo jogo agendado"
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
