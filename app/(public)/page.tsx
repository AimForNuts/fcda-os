import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle2, Clock3 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getTeamPresentation } from '@/lib/games/team-presentation'
import { cn } from '@/lib/utils'
import type { Game } from '@/types'

export const metadata = { title: 'FCDA — Futebol Clube Dragões da Areosa' }

const teamA = getTeamPresentation('a')
const teamB = getTeamPresentation('b')

function formatScheduleDate(date: string) {
  const d = new Date(date)

  return {
    dayMonth: d.toLocaleDateString('pt-PT', {
      day: 'numeric',
      month: 'short',
    }),
    weekday: d.toLocaleDateString('pt-PT', { weekday: 'long' }),
    time: d.toLocaleTimeString('pt-PT', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  }
}

function HomeGameCard({ game }: { game: Game }) {
  const formatted = formatScheduleDate(game.date)
  const isFinished = game.status === 'finished'
  const statusLabel = isFinished ? 'Concluído' : 'Agendado'
  const score =
    isFinished && game.score_a != null && game.score_b != null
      ? `${game.score_a} - ${game.score_b}`
      : formatted.time

  return (
    <article className="min-w-0">
      <div
        className={cn(
          'relative overflow-hidden rounded-xl shadow-sm ring-1',
          'bg-background',
          isFinished ? 'ring-fcda-gold/60' : 'ring-fcda-navy/20',
        )}
      >
        <div
          className={cn(
            'relative z-10 h-1',
            isFinished ? 'bg-fcda-gold' : 'bg-fcda-navy',
          )}
        />
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
              <div
                className={cn(
                  'mb-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase',
                  isFinished
                    ? 'bg-fcda-gold text-fcda-navy ring-1 ring-fcda-gold/70'
                    : 'bg-fcda-navy text-white',
                )}
              >
                {isFinished ? (
                  <CheckCircle2 size={12} aria-hidden />
                ) : (
                  <Clock3 size={12} aria-hidden />
                )}
                {statusLabel}
              </div>
              <p className="truncate text-xs text-muted-foreground">{game.location}</p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-bold text-fcda-navy">{formatted.dayMonth}</p>
            <p className="text-xs font-medium text-muted-foreground">{formatted.weekday}</p>
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

          <div
            className={cn(
              'flex min-w-16 items-center justify-center rounded-full border px-3 py-1 text-sm font-bold tabular-nums shadow-sm',
              isFinished
                ? 'border-fcda-gold bg-fcda-gold text-fcda-navy'
                : 'border-fcda-navy bg-fcda-navy text-white',
            )}
          >
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
          className={cn(
            'relative z-10 block border-t px-4 py-3 text-center text-sm font-bold transition-colors',
            isFinished
              ? 'border-border/70 text-fcda-navy hover:bg-muted/50'
              : 'border-fcda-navy bg-fcda-navy text-white hover:bg-fcda-navy/90',
          )}
        >
          Detalhes
        </Link>
      </div>
    </article>
  )
}

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
      {/* Hero — icy blue background echoing the match card */}
      <section className="relative flex flex-col items-center justify-center gap-2 px-4 py-16 text-center bg-fcda-ice">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/crest.png"
          alt="Futebol Clube Dragões da Areosa"
          className="-mb-12 h-64 w-64 object-contain drop-shadow-lg md:-mb-16 md:h-80 md:w-80"
        />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-fcda-navy/60">
            Futebol Clube
          </p>
          <h1 className="mt-1 text-3xl font-extrabold uppercase tracking-tight text-fcda-navy md:text-5xl">
            Dragões da Areosa
          </h1>
        </div>
        <p className="max-w-md text-fcda-navy/70">
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
            <div className="-mx-4 grid auto-cols-[minmax(15rem,1fr)] grid-flow-col gap-5 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
              {completedGameList.map((game) => (
                <HomeGameCard key={game.id} game={game} />
              ))}
            </div>
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
