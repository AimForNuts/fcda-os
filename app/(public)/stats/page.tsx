import { createClient } from '@/lib/supabase/server'
import { fetchSessionContext } from '@/lib/auth/permissions'
import { StatsTable } from '@/components/stats/StatsTable'

export const metadata = { title: 'Estatísticas — FCDA' }

export default async function StatsPage() {
  const supabase = await createClient()
  const session = await fetchSessionContext()
  const isApproved = session?.profile?.approved ?? false

  const { data: players } = await supabase
    .from('player_stats')
    .select(
      'id, display_name, shirt_number, profile_id, total_all, total_comp, wins_all, draws_all, losses_all, wins_comp, draws_comp, losses_comp',
    )

  return (
    <div className="container max-w-screen-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-fcda-navy mb-6">Estatísticas</h1>
      <StatsTable players={players ?? []} isAnonymised={!isApproved} />
    </div>
  )
}
