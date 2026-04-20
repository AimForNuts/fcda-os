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

  const { data: game } = (await supabase
    .from('games')
    .select('*')
    .eq('id', id)
    .single()) as { data: Game | null; error: unknown }

  if (!game) notFound()

  // Format date for datetime-local input: strip seconds + timezone offset
  // Input expects "YYYY-MM-DDTHH:MM"
  const dateForInput = game.date.slice(0, 16)

  return (
    <div className="max-w-lg mx-auto">
      <EditGameForm
        gameId={id}
        defaultDate={dateForInput}
        defaultLocation={game.location}
        defaultCountsForStats={game.counts_for_stats}
      />
    </div>
  )
}
