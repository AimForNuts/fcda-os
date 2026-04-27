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
    <div className="max-w-lg mx-auto">
      <EditGameForm
        gameId={id}
        defaultDate={game.date}
        defaultLocation={game.location}
        defaultCountsForStats={game.counts_for_stats}
      />
    </div>
  )
}
