import { createServiceClient } from '@/lib/supabase/server'
import { signPlayerAvatarRecords } from '@/lib/players/avatar.server'
import { CoachPlayerList } from './CoachPlayerList'

export const metadata = { title: 'Coach — FCDA Admin' }

export default async function CoachPage() {
  const admin = createServiceClient()
  const { data } = await admin
    .from('players')
    .select('id, sheet_name, shirt_number, current_rating, avatar_path')
    .order('sheet_name') as {
      data: Array<{
        id: string
        sheet_name: string
        shirt_number: number | null
        current_rating: number | null
        avatar_path: string | null
      }> | null
      error: unknown
    }
  const players = await signPlayerAvatarRecords(data ?? [], true)

  return (
    <div className="space-y-4">
      <CoachPlayerList players={players} />
    </div>
  )
}
