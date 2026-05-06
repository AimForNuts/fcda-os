import Link from 'next/link'
import Image from 'next/image'
import { CompletedGamesCarousel } from '@/components/home/CompletedGamesCarousel'
import { ScheduledGamesCarousel } from '@/components/home/ScheduledGamesCarousel'
import { TranslatedText } from '@/components/i18n/TranslatedText'
import { createClient } from '@/lib/supabase/server'
import { fetchMatchCommentCounts } from '@/lib/matches/comment-counts'
import { fetchMatchWeather, type MatchWeather } from '@/lib/weather/open-meteo'
import type { Game, Recinto } from '@/types'

export const metadata = { title: 'FCDA — Futebol Clube Dragões da Areosa' }

function SquadSeparator() {
  return (
    <section
      className="group relative isolate min-h-[12.5rem] overflow-hidden bg-fcda-navy text-white md:min-h-[15.5rem]"
      aria-labelledby="squad-separator-title"
    >
      <Image
        src="/miguel_gomes.jpeg"
        alt=""
        fill
        sizes="100vw"
        className="absolute inset-0 -z-30 object-cover object-[55%_22%] transition duration-500 group-hover:scale-[1.03]"
        aria-hidden
      />
      <div className="absolute inset-0 -z-20 bg-blue-950/70 transition-colors duration-300 group-hover:bg-blue-800/72" aria-hidden />
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-r from-blue-950/80 via-blue-800/55 to-blue-700/40"
        aria-hidden
      />

      <div className="container mx-auto flex min-h-[8rem] max-w-screen-xl items-center px-4 py-8 md:min-h-[10.5rem]">
        <h2
          id="squad-separator-title"
          className="max-w-[12ch] text-4xl font-extrabold tracking-tight text-white drop-shadow-sm sm:max-w-none sm:text-5xl md:text-6xl"
        >
          <TranslatedText i18nKey="home.squadSeason" />
        </h2>
      </div>

      <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-blue-950/35 backdrop-blur-[1px]">
        <div className="container mx-auto max-w-screen-xl px-0 sm:px-4">
          <Link
            href="/players"
            className="block w-fit bg-blue-700 px-8 py-4 text-sm font-bold text-white transition-colors hover:bg-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:min-w-56 sm:px-9 md:[clip-path:polygon(0_0,100%_0,92%_100%,0_100%)]"
          >
            <TranslatedText i18nKey="home.viewSquad" />
          </Link>
        </div>
      </div>
    </section>
  )
}

export default async function HomePage() {
  const supabase = await createClient()

  const [{ data: scheduledGames }, { data: completedGames }] = await Promise.all([
    supabase
      .from('games')
      .select('*')
      .eq('status', 'scheduled')
      .order('date', { ascending: true })
      .limit(3),
    supabase
      .from('games')
      .select('*')
      .eq('status', 'finished')
      .order('date', { ascending: false })
      .limit(3),
  ]) as [{ data: Game[] | null; error: unknown }, { data: Game[] | null; error: unknown }]
  const scheduledGameList = scheduledGames ?? []
  const completedGameList = completedGames ?? []
  const commentCountGameIds = [
    ...scheduledGameList.map((game) => game.id),
    ...completedGameList.map((game) => game.id),
  ]
  const commentCounts = await fetchMatchCommentCounts(supabase, commentCountGameIds)
  const scheduledCommentCounts = Object.fromEntries(
    scheduledGameList.map((game) => [game.id, commentCounts.get(game.id) ?? 0]),
  )
  const completedCommentCounts = Object.fromEntries(
    completedGameList.map((game) => [game.id, commentCounts.get(game.id) ?? 0]),
  )
  const gamesForWeather = [...scheduledGameList, ...completedGameList]
  const recintoIds = [
    ...new Set(
      gamesForWeather
        .map((game) => game.recinto_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ]
  const recintosById = new Map<string, Recinto>()

  if (recintoIds.length > 0) {
    const { data: recintos } = await supabase
      .from('recintos')
      .select('*')
      .in('id', recintoIds) as { data: Recinto[] | null; error: unknown }

    for (const recinto of recintos ?? []) {
      recintosById.set(recinto.id, recinto)
    }
  }

  const weatherEntries = await Promise.all(
    gamesForWeather.map(async (game) => {
      const recinto = game.recinto_id ? recintosById.get(game.recinto_id) : null
      return [game.id, await fetchMatchWeather(recinto, game.date)] as const
    }),
  )
  const weatherByGameId: Record<string, MatchWeather | null> = Object.fromEntries(weatherEntries)

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative isolate flex min-h-[30rem] flex-col items-center justify-center gap-2 overflow-hidden bg-fcda-navy px-4 py-16 text-center text-white">
        <Image
          src="/areosa_dragon.webp"
          alt=""
          fill
          preload
          sizes="100vw"
          className="absolute inset-0 -z-20 object-cover object-center"
          aria-hidden
        />
        <div className="absolute inset-0 -z-10 bg-fcda-navy/82" aria-hidden />
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-b from-black/20 via-black/10 to-fcda-navy/50"
          aria-hidden
        />
        <Image
          src="/crest.png"
          alt="Futebol Clube Dragões da Areosa"
          width={320}
          height={480}
          className="-mb-12 h-64 w-64 object-contain drop-shadow-lg md:-mb-16 md:h-80 md:w-80"
        />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/70">
            <TranslatedText i18nKey="home.clubType" />
          </p>
          <h1 className="mt-1 text-3xl font-extrabold uppercase tracking-tight text-white md:text-5xl">
            <TranslatedText i18nKey="home.clubName" />
          </h1>
        </div>
        <p className="max-w-md text-white/75">
          <TranslatedText i18nKey="home.heroSubtitleFull" />
        </p>
        <div className="flex items-center gap-3 text-fcda-gold">
          <span className="h-px w-16 bg-fcda-gold/50" />
          <span className="text-lg">✦</span>
          <span className="h-px w-16 bg-fcda-gold/50" />
        </div>
      </section>

      {/* Scheduled matches section */}
      <section className="container mx-auto max-w-screen-xl px-4 py-10">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <TranslatedText i18nKey="home.scheduledGames" />
          </h2>
          <Link
            href="/matches"
            className="text-xs text-primary underline underline-offset-2 hover:text-primary/80"
          >
            <TranslatedText i18nKey="home.viewAll" />
          </Link>
        </div>

        {scheduledGameList.length > 0 ? (
          <ScheduledGamesCarousel
            games={scheduledGameList}
            commentCounts={scheduledCommentCounts}
            weatherByGameId={weatherByGameId}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            <TranslatedText i18nKey="home.noScheduledGames" />
          </p>
        )}
      </section>

      {/* Completed matches section */}
      <section className="bg-muted/30 py-10">
        <div className="container mx-auto max-w-screen-xl px-4">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <TranslatedText i18nKey="home.completedGames" />
            </h2>
            <Link
              href="/matches"
              className="text-xs text-primary underline underline-offset-2 hover:text-primary/80"
            >
              <TranslatedText i18nKey="home.viewAll" />
            </Link>
          </div>

          {completedGameList.length > 0 ? (
            <CompletedGamesCarousel
              games={completedGameList}
              commentCounts={completedCommentCounts}
              weatherByGameId={weatherByGameId}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              <TranslatedText i18nKey="home.noCompletedGames" />
            </p>
          )}
        </div>
      </section>

      <SquadSeparator />
    </div>
  )
}
