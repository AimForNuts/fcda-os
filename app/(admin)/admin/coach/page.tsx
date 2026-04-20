import { createServiceClient } from '@/lib/supabase/server'
import { CoachPlayerList } from './CoachPlayerList'

type PlayerRow = {
  id: string
  sheet_name: string
  shirt_number: number | null
  current_rating: number | null
}

export const metadata = { title: 'Coach — FCDA Admin' }

export default async function CoachPage() {
  const admin = createServiceClient()
  const { data: players } = await admin
    .from('players')
    .select('id, sheet_name, shirt_number, current_rating')
    .order('sheet_name') as { data: PlayerRow[] | null; error: unknown }

  return (
    <div className="space-y-4">
      <CoachPlayerList players={players ?? []} />
    </div>
  )
}
