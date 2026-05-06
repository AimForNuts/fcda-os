import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TranslatedText } from '@/components/i18n/TranslatedText'
import type { Game } from '@/types'
import { FinishGameForm } from './FinishGameForm'

export default async function FinishGamePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: game } = await supabase
    .from('games')
    .select('id, date, location, status, score_a, score_b')
    .eq('id', id)
    .single() as { data: Pick<Game, 'id' | 'date' | 'location' | 'status' | 'score_a' | 'score_b'> | null; error: unknown }

  if (!game) notFound()

  const d = new Date(game.date)
  const dateStr = d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })

  if (game.status !== 'scheduled') {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-fcda-navy"><TranslatedText i18nKey="mod.finish.title" /></h1>
        <p className="text-sm text-muted-foreground">{dateStr} · {game.location}</p>
        <p className="text-sm text-amber-600 font-medium">
          {game.status === 'finished'
            ? <TranslatedText i18nKey="mod.finish.alreadyFinished" />
            : <TranslatedText i18nKey="mod.finish.cancelled" />}
        </p>
        {game.status === 'finished' && game.score_a != null && game.score_b != null && (
          <p className="text-lg font-bold">{game.score_a} – {game.score_b}</p>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-fcda-navy"><TranslatedText i18nKey="mod.finish.title" /></h1>
      <p className="text-sm text-muted-foreground">{dateStr} · {game.location}</p>
      <FinishGameForm gameId={id} />
    </div>
  )
}
