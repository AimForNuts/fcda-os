'use client'

import { Suspense, type ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Info, TriangleAlertIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n/config'
import { MatchesDateFilter } from '@/components/matches/MatchesDateFilter'
import { NewGameModal } from '@/components/matches/NewGameModal'
import { RecintoLink } from '@/components/matches/RecintoLink'
import { WeatherSummary } from '@/components/matches/WeatherSummary'
import { cn } from '@/lib/utils'
import { GAME_TIME_ZONE } from '@/lib/games/format-schedule-date'
import { getTeamPresentation } from '@/lib/games/team-presentation'
import { bcp47ForI18nLanguage } from '@/lib/i18n/date-locale'
import type { MatchWeather } from '@/lib/weather/open-meteo'
import type { Game, Recinto } from '@/types'
import type { MatchesView } from '@/lib/matches/matches-view'

const teamA = getTeamPresentation('a')
const teamB = getTeamPresentation('b')

const matchesRoutes: Record<MatchesView, string> = {
  calendar: '/matches/calendario',
  results: '/matches/resultados',
  mine: '/matches/os-meus-jogos',
}

function buildMatchesHref(view: MatchesView, from?: string, to?: string) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const query = params.toString()
  return query ? `${matchesRoutes[view]}?${query}` : matchesRoutes[view]
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

function isInLast24HoursBeforeKickoff(kickoffIso: string) {
  const kickoff = new Date(kickoffIso).getTime()
  const now = Date.now()
  return now >= kickoff - MS_PER_DAY && now < kickoff
}

function formatHeroDate(iso: string, lng: string, t: (key: string, opts?: Record<string, string>) => string) {
  const bcp47 = bcp47ForI18nLanguage(lng)
  const d = new Date(iso)
  const gates = new Date(d.getTime() - 90 * 60 * 1000)
  const date = d.toLocaleDateString(bcp47, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: GAME_TIME_ZONE,
  })
  const time = d.toLocaleTimeString(bcp47, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: GAME_TIME_ZONE,
  })
  const openingTime = gates.toLocaleTimeString(bcp47, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: GAME_TIME_ZONE,
  })

  const dateCap = `${date.charAt(0).toUpperCase()}${date.slice(1)}`
  return {
    headline: t('matches.page.heroHeadline', { date: dateCap, time }),
    date: d.toLocaleDateString(bcp47, {
      day: 'numeric',
      month: 'long',
      timeZone: GAME_TIME_ZONE,
    }),
    time,
    openingTime,
  }
}

type RecintoLinkData = Pick<Recinto, 'name' | 'google_place_id' | 'latitude' | 'longitude' | 'maps_url'>

function MatchesHero({
  game,
  recinto,
  weather,
}: {
  game: Game | null
  recinto?: RecintoLinkData | null
  weather?: MatchWeather | null
}) {
  const { t } = useTranslation()
  const lng = i18n.language
  const formatted = game ? formatHeroDate(game.date, lng, t) : null
  const showSoldOutTickets = game ? isInLast24HoursBeforeKickoff(game.date) : false

  if (!game) {
    return (
      <section className="bg-fcda-navy text-white">
        <div className="container mx-auto grid max-w-screen-xl gap-8 px-4 py-10 md:grid-cols-[1fr_auto] md:items-end md:py-14">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-fcda-gold">
              {t('matches.page.clubName')}
            </p>
            <h1 className="mt-3 text-5xl font-black uppercase tracking-tight md:text-7xl">
              {t('matches.title')}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 md:text-base">
              {t('matches.page.heroEmptyDescription')}
            </p>
          </div>
          <Image
            src="/crest.png"
            alt=""
            width={160}
            height={160}
            className="hidden h-40 w-40 object-contain opacity-90 drop-shadow-lg md:block"
            aria-hidden
          />
        </div>
      </section>
    )
  }

  return (
    <section className="relative isolate min-h-[30rem] overflow-hidden bg-fcda-navy text-white">
      <Image
        src="/miguel_gomes.jpeg"
        alt=""
        fill
        preload
        sizes="100vw"
        className="absolute inset-0 -z-30 object-cover object-[right_24%]"
        aria-hidden
      />
      <div className="absolute inset-0 -z-20 bg-blue-950/58" aria-hidden />
      <div
        className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(0,32,116,0.88)_0%,rgba(0,65,190,0.58)_48%,rgba(0,94,230,0.28)_100%)]"
        aria-hidden
      />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-blue-950/88 to-transparent" aria-hidden />
      <div className="container mx-auto flex min-h-[30rem] max-w-screen-xl flex-col px-4 pb-12 pt-12 md:pb-16 md:pt-16">
        <div className="mt-auto">
          <h1 className="sr-only">{t('matches.page.heroSrTitle')}</h1>
          <div className="inline-flex w-fit items-center gap-5">
            <Image
              src={teamA.imageSrc}
              alt={teamA.imageAlt}
              width={112}
              height={154}
              className="h-[6.875rem] w-auto object-contain drop-shadow-lg sm:h-[8.875rem] md:h-[9.875rem]"
            />
            <span className="h-[6.875rem] w-px bg-white/16 sm:h-[8.875rem] md:h-[9.875rem]" aria-hidden />
            <Image
              src={teamB.imageSrc}
              alt={teamB.imageAlt}
              width={112}
              height={154}
              className="h-[6.5rem] w-auto object-contain drop-shadow-lg sm:h-[7.5rem] md:h-[8.75rem]"
            />
          </div>

          <p className="mt-8 max-w-5xl text-3xl font-black tracking-tight text-white/68 sm:text-4xl md:text-5xl">
            {formatted?.headline ?? t('matches.page.headlineFallback')}
          </p>

          <div className="mt-8 flex flex-col items-stretch gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8 md:gap-10">
            <div
              className={cn(
                'grid w-fit gap-3 text-sm text-white/92 sm:gap-0',
                weather ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2',
              )}
            >
              <div className="min-w-0 border-r border-white/14 pr-4 sm:px-5 sm:pl-0">
                <p className="text-base font-medium text-white/38">{t('matches.page.venueLabel')}</p>
                <RecintoLink
                  location={game?.location ?? t('matches.page.defaultVenue')}
                  recinto={recinto}
                  className="mt-1 inline-flex max-w-full items-center gap-1 font-semibold text-white hover:text-white hover:underline"
                />
              </div>
              <div className={cn('min-w-0 pl-4 sm:px-5', weather && 'sm:border-r sm:border-white/14')}>
                <p className="text-base font-medium text-white/38">{t('matches.page.gatesOpenLabel')}</p>
                <p className="mt-1 font-semibold">{formatted?.openingTime ?? t('matches.page.tbd')}</p>
              </div>
              {weather ? (
                <div className="hidden min-w-0 pl-5 sm:block">
                  <p className="text-base font-medium text-white/38">Tempo</p>
                  <WeatherSummary weather={weather} variant="hero" className="mt-1" />
                </div>
              ) : null}
            </div>
            <div
              role="status"
              className={cn(
                'flex w-full max-w-full items-center justify-center gap-2.5 rounded-lg px-4 py-2.5 text-center text-sm font-semibold tracking-tight shadow-sm backdrop-blur-sm sm:inline-flex sm:w-auto sm:shrink-0 sm:self-end sm:text-base',
                showSoldOutTickets
                  ? 'border border-amber-400/45 bg-amber-500/[0.16] text-amber-50 supports-[backdrop-filter]:bg-amber-500/[0.12]'
                  : 'border border-white/28 bg-white/[0.1] text-white/95 supports-[backdrop-filter]:bg-white/[0.08]',
              )}
            >
              {showSoldOutTickets ? (
                <>
                  <TriangleAlertIcon className="size-5 shrink-0 text-amber-200 opacity-95" aria-hidden />
                  {t('matches.page.ticketsSoldOut')}
                </>
              ) : (
                <>
                  <Info className="size-5 shrink-0 text-white/85" aria-hidden />
                  {t('matches.page.ticketsAvailable')}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function MatchesViewTabs({
  activeView,
  from,
  to,
  calendarCount,
  resultsCount,
  mineCount,
}: {
  activeView: MatchesView
  from?: string
  to?: string
  calendarCount: number
  resultsCount: number
  mineCount: number
}) {
  const { t } = useTranslation()
  const tabs: Array<{ view: MatchesView; labelKey: string; mobileLabel: string; count: number }> = [
    { view: 'calendar', labelKey: 'matches.page.tabs.calendar', mobileLabel: 'Calendário', count: calendarCount },
    { view: 'results', labelKey: 'matches.page.tabs.results', mobileLabel: 'Resultados', count: resultsCount },
    { view: 'mine', labelKey: 'matches.page.tabs.mine', mobileLabel: 'Meus', count: mineCount },
  ]

  return (
    <nav
      className="grid min-w-0 grid-cols-3 gap-1 rounded-lg border border-border bg-muted/40 p-1 sm:flex sm:items-center sm:gap-1 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0"
      aria-label={t('matches.page.tabsNavAriaLabel')}
    >
      {tabs.map((tab) => {
        const active = activeView === tab.view

        return (
          <Link
            key={tab.view}
            href={buildMatchesHref(tab.view, from, to)}
            scroll={false}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-black uppercase tracking-normal transition-colors sm:h-11 sm:justify-start sm:gap-2 sm:rounded-none sm:border-b-2 sm:px-5 sm:text-sm',
              active
                ? 'bg-white text-fcda-blue shadow-sm sm:border-fcda-blue sm:bg-transparent sm:shadow-none'
                : 'text-muted-foreground hover:bg-background/60 hover:text-foreground sm:border-transparent sm:hover:border-border sm:hover:bg-transparent',
            )}
          >
            <span className="sm:hidden">{tab.mobileLabel}</span>
            <span className="hidden sm:inline">{t(tab.labelKey)}</span>
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums sm:px-2 sm:text-xs',
                active ? 'bg-fcda-blue/10 text-fcda-blue' : 'bg-muted text-muted-foreground',
              )}
            >
              {tab.count}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

export type PersonalEmptyKind = 'none' | 'login' | 'pending' | 'no_player'

export function MatchesListingChrome({
  heroGame,
  heroRecinto,
  heroWeather,
  activeView,
  from,
  to,
  calendarCount,
  resultsCount,
  mineCount,
  noGamesInDb,
  emptyAfterFilter,
  emptyVisibleList,
  personalEmptyKind,
  canCreateGame,
  listedGameCount,
  children,
}: {
  heroGame: Game | null
  heroRecinto?: RecintoLinkData | null
  heroWeather?: MatchWeather | null
  activeView: MatchesView
  from?: string
  to?: string
  calendarCount: number
  resultsCount: number
  mineCount: number
  noGamesInDb: boolean
  emptyAfterFilter: boolean
  emptyVisibleList: boolean
  personalEmptyKind: PersonalEmptyKind
  canCreateGame: boolean
  listedGameCount: number
  children: ReactNode
}) {
  const { t } = useTranslation()
  const viewHeadingKey =
    activeView === 'calendar'
      ? 'matches.page.views.calendar.heading'
      : activeView === 'results'
        ? 'matches.page.views.results.heading'
        : 'matches.page.views.mine.heading'
  const countLabelKey =
    activeView === 'calendar'
      ? 'matches.page.views.calendar.countLabel'
      : activeView === 'results'
        ? 'matches.page.views.results.countLabel'
        : 'matches.page.views.mine.countLabel'
  const emptyTabKey =
    activeView === 'calendar'
      ? 'matches.page.views.calendar.empty'
      : activeView === 'results'
        ? 'matches.page.views.results.empty'
        : 'matches.page.views.mine.empty'

  const personalMessage =
    personalEmptyKind === 'login'
      ? t('matches.page.empty.login')
      : personalEmptyKind === 'pending'
        ? t('matches.page.empty.pending')
        : personalEmptyKind === 'no_player'
          ? t('matches.page.empty.noPlayer')
          : null

  return (
    <div className="bg-white">
      <MatchesHero game={heroGame} recinto={heroRecinto} weather={heroWeather} />

      <main id="matches-list" className="container mx-auto max-w-screen-xl px-4 py-8 md:py-10">
        <div className="mb-8 border-b border-border">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase text-fcda-blue">{t('matches.title')}</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                {t(viewHeadingKey)}
              </h2>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-3 sm:justify-end">
              <Suspense
                fallback={
                  <div
                    className="h-8 w-full animate-pulse rounded-md bg-muted/50 sm:w-40"
                    aria-hidden
                  />
                }
              >
                <MatchesDateFilter className="w-full sm:w-auto" />
              </Suspense>
              {canCreateGame && <NewGameModal />}
            </div>
          </div>
          <div className="sticky top-16 z-30 -mx-4 mt-5 overflow-x-auto border-y border-border bg-white px-4 py-2 sm:top-20 sm:mx-0 sm:border-b sm:border-t-0 sm:px-0 sm:py-0">
            <MatchesViewTabs
              activeView={activeView}
              from={from}
              to={to}
              calendarCount={calendarCount}
              resultsCount={resultsCount}
              mineCount={mineCount}
            />
          </div>
        </div>

        <div className="mb-5 flex min-w-0 flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">{t(countLabelKey)}</p>
            <p className="text-sm text-muted-foreground">
              {t('matches.page.gameCount', { count: listedGameCount })}
            </p>
          </div>
        </div>

        <div className="hidden lg:grid lg:grid-cols-[minmax(8rem,14rem)_1fr_minmax(10rem,14rem)] lg:gap-6 lg:border-y lg:border-border lg:bg-muted/20 lg:px-5 lg:py-3 lg:text-xs lg:font-black lg:uppercase lg:text-muted-foreground">
          <span>{t('matches.page.listColDate')}</span>
          <span aria-hidden />
          <span className="text-right">{t('matches.page.listColDetails')}</span>
        </div>

        <div className="flex flex-col gap-3 pt-3 lg:gap-0 lg:pt-0">
          {personalMessage ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
              {personalMessage}
            </p>
          ) : noGamesInDb ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
              {t('matches.noMatches')}
            </p>
          ) : emptyAfterFilter ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
              {t('matches.page.empty.adjustFilter')}
            </p>
          ) : emptyVisibleList ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
              {t(emptyTabKey)}
            </p>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  )
}
