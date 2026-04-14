import { createClient } from '@/lib/supabase/server'
import { fetchSessionContext } from '@/lib/auth/permissions'
import { StatsTable } from '@/components/stats/StatsTable'

export const metadata = { title: 'Estatísticas — FCDA' }

export default async function StatsPage() {
  const supabase = await createClient()
  const session = await fetchSessionContext()
  const isApproved = session?.profile?.approved ?? false

  // players_public view handles anonymisation via is_approved() on the caller's JWT.
  // Approved users get real sheet_name; guests/pending get "Jogador N".
  const { data: players } = await supabase
    .from('players_public')
    .select('id, display_name, shirt_number, current_rating, profile_id')
    .order('current_rating', { ascending: false, nullsFirst: false })

  return (
    <div className="container max-w-screen-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-fcda-navy mb-6">Estatísticas</h1>
      <StatsTable players={players ?? []} isAnonymised={!isApproved} />
    </div>
  )
}
