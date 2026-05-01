import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { MatchCard } from '@/components/matches/MatchCard'
import type { Game } from '@/types'

export const metadata = { title: 'FCDA — Futebol Clube Dragões da Areosa' }

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
      .limit(2),
  ]) as [
    { data: Game | null; error: unknown },
    { data: Game[] | null; error: unknown },
  ]

  return (
    <div className="flex flex-col">
      {/* Hero — icy blue background echoing the match card */}
      <section className="relative flex flex-col items-center justify-center gap-6 px-4 py-16 text-center bg-fcda-ice">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/crest.png"
          alt="Futebol Clube Dragões da Areosa"
          className="h-36 w-36 object-contain drop-shadow-lg"
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

      {/* Next match section */}
      <section className="container mx-auto max-w-screen-md px-4 py-10 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Próximo Jogo
          </h2>
          <Link
            href="/matches"
            className="text-xs text-fcda-navy underline underline-offset-2 hover:text-fcda-navy/70"
          >
            Ver todos
          </Link>
        </div>
        {nextGame ? (
          <MatchCard game={nextGame} />
        ) : (
          <p className="text-sm text-muted-foreground py-4">
            Sem jogos agendados de momento.
          </p>
        )}
      </section>

      {/* Completed matches section */}
      <section className="container mx-auto max-w-screen-md px-4 pb-10 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Últimos Jogos
          </h2>
          <Link
            href="/matches"
            className="text-xs text-fcda-navy underline underline-offset-2 hover:text-fcda-navy/70"
          >
            Ver todos
          </Link>
        </div>
        {completedGames && completedGames.length > 0 ? (
          <div className="flex flex-col gap-3">
            {completedGames.map((game) => (
              <MatchCard key={game.id} game={game} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">
            Ainda não há jogos concluídos.
          </p>
        )}
      </section>
    </div>
  )
}
