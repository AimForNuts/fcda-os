import Link from 'next/link'
import Image from 'next/image'
import { Clock3 } from 'lucide-react'
import { CompletedGamesCarousel } from '@/components/home/CompletedGamesCarousel'
import { formatScheduleDate } from '@/lib/games/format-schedule-date'
import { createClient } from '@/lib/supabase/server'
import { getTeamPresentation } from '@/lib/games/team-presentation'
import type { Game } from '@/types'

export const metadata = { title: 'FCDA — Futebol Clube Dragões da Areosa' }

const teamA = getTeamPresentation('a')
const teamB = getTeamPresentation('b')

function ScheduledGameFeature({ game }: { game: Game }) {
  const formatted = formatScheduleDate(game.date)

  return (
    <article className="relative overflow-hidden rounded-xl bg-fcda-navy text-white shadow-sm">
      <Image
        src="/crest.png"
        alt=""
        width={320}
        height={320}
        className="pointer-events-none absolute right-[-3rem] top-1/2 z-0 h-80 w-80 -translate-y-1/2 object-contain opacity-20"
        aria-hidden
      />
      <div className="relative z-10 grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center">
        <div className="min-w-0">
          <div className="mb-4 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold uppercase text-white ring-1 ring-white/15">
            <Clock3 size={12} aria-hidden />
            Agendado
          </div>
          <p className="text-sm font-medium text-white/70">Próximo jogo</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">
            {formatted.dayMonth}{' '}
            <span className="font-medium text-white/65">{formatted.weekday}</span>
          </h2>
          <p className="mt-2 text-sm text-white/75">
            {game.location} · {formatted.time}
          </p>
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
    </article>
  )
}

export default async function HomePage() {
  const supabase = await createClient()

  const [{ data: nextGame }, { data: completedGames }] = await Promise.all([
    supabase
      .from('games')
      .select('*')
      .eq('status', 'scheduled')
      .order('date', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('games')
      .select('*')
      .eq('status', 'finished')
      .order('date', { ascending: false })
      .limit(3),
  ]) as [
    { data: Game | null; error: unknown },
    { data: Game[] | null; error: unknown },
  ]
  const completedGameList = completedGames ?? []

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
            Futebol Clube
          </p>
          <h1 className="mt-1 text-3xl font-extrabold uppercase tracking-tight text-white md:text-5xl">
            Dragões da Areosa
          </h1>
        </div>
        <p className="max-w-md text-white/75">
          Acompanha os jogos, vê as estatísticas e gere a equipa.
        </p>
        <div className="flex items-center gap-3 text-fcda-gold">
          <span className="h-px w-16 bg-fcda-gold/50" />
          <span className="text-lg">✦</span>
          <span className="h-px w-16 bg-fcda-gold/50" />
        </div>
      </section>

      {/* Scheduled match section */}
      <section className="container mx-auto max-w-screen-lg px-4 py-10">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Jogo Agendado
          </h2>
          <Link
            href="/matches"
            className="text-xs text-fcda-navy underline underline-offset-2 hover:text-fcda-navy/70"
          >
            Ver todos
          </Link>
        </div>

        {nextGame ? (
          <ScheduledGameFeature game={nextGame} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Sem jogos agendados de momento.
          </p>
        )}
      </section>

      {/* Completed matches section */}
      <section className="bg-muted/30 py-10">
        <div className="container mx-auto max-w-screen-lg px-4">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Jogos Concluídos
            </h2>
            <Link
              href="/matches"
              className="text-xs text-fcda-navy underline underline-offset-2 hover:text-fcda-navy/70"
            >
              Ver todos
            </Link>
          </div>

          {completedGameList.length > 0 ? (
            <CompletedGamesCarousel games={completedGameList} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Ainda não há jogos concluídos.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
