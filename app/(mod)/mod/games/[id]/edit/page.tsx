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

  // Convert UTC-stored date to local time for datetime-local input (which expects local time)
  const d = new Date(game.date)
  const pad = (n: number) => String(n).padStart(2, '0')
  const dateForInput = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

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
