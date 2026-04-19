import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchSessionContext } from '@/lib/auth/permissions'
import { ProfileForm } from '@/components/profile/ProfileForm'

export const metadata = { title: 'O meu perfil — FCDA' }

export default async function ProfilePage() {
  const session = await fetchSessionContext()
  if (!session) redirect('/auth/login')

  const admin = createServiceClient()
  const { data: player } = await admin
    .from('players')
    .select('sheet_name, shirt_number, preferred_positions')
    .eq('profile_id', session.userId)
    .maybeSingle() as {
      data: {
        sheet_name: string
        shirt_number: number | null
        preferred_positions: string[]
      } | null
      error: unknown
    }

  return (
    <div className="container max-w-screen-sm mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-fcda-navy mb-6">O meu perfil</h1>
      {player ? (
        <ProfileForm
          sheetName={player.sheet_name}
          shirtNumber={player.shirt_number}
          preferredPositions={player.preferred_positions ?? []}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          A tua conta ainda não está ligada a um jogador. Contacta um administrador.
        </p>
      )}
    </div>
  )
}
