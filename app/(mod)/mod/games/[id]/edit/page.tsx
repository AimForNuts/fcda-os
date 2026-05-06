import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Game } from '@/types'
import { EditGameForm } from './EditGameForm'

export default async function EditGamePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('id', id)
    .single() as { data: Game | null; error: unknown }

  if (!game) notFound()

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-10">
      <EditGameForm
        gameId={id}
        defaultDate={game.date}
        defaultLocation={game.location}
        defaultRecintoId={game.recinto_id}
        defaultCountsForStats={game.counts_for_stats}
      />
    </div>
  )
}
