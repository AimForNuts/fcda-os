import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { signPlayerAvatarPath } from '@/lib/players/avatar.server'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchSessionContext } from '@/lib/auth/permissions'
import { ProfileForm } from '@/components/profile/ProfileForm'

export const metadata: Metadata = { title: 'O meu perfil — FCDA' }

export default async function ProfilePage() {
  const session = await fetchSessionContext()
  if (!session) redirect('/auth/login')

  const admin = createServiceClient()
  const { data: player, error: playerError } = await admin
    .from('players')
    .select('sheet_name, shirt_number, preferred_positions, avatar_path')
    .eq('profile_id', session.userId)
    .maybeSingle() as {
      data: {
        sheet_name: string
        shirt_number: number | null
        preferred_positions: string[]
        avatar_path: string | null
      } | null
      error: Error | null
    }

  if (playerError) throw playerError
  const avatarUrl = player
    ? await signPlayerAvatarPath(player.avatar_path, true)
    : null

  return (
    <div className="container max-w-screen-sm mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-fcda-navy mb-6">O meu perfil</h1>
      {player ? (
        <ProfileForm
          playerName={player.sheet_name}
          sheetName={player.sheet_name}
          shirtNumber={player.shirt_number}
          preferredPositions={player.preferred_positions ?? []}
          avatarUrl={avatarUrl}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          A tua conta ainda não está ligada a um jogador. Contacta um administrador.
        </p>
      )}
    </div>
  )
}
