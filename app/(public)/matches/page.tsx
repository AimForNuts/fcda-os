import { createClient } from '@/lib/supabase/server'
import { MatchCard } from '@/components/matches/MatchCard'
import type { Game } from '@/types'

export const metadata = { title: 'Jogos — FCDA' }

export default async function MatchesPage() {
  const supabase = await createClient()

  const { data: games } = await supabase
    .from('games')
    .select('*')
    .order('date', { ascending: false }) as { data: Game[] | null; error: unknown }

  return (
    <div className="container max-w-screen-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-fcda-navy mb-6">Jogos</h1>
      {!games?.length ? (
        <p className="text-sm text-muted-foreground">
          Ainda não há jogos registados.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {games.map((g) => (
            <MatchCard key={g.id} game={g} />
          ))}
        </div>
      )}
    </div>
  )
}
