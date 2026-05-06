import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, ExternalLink, ShieldAlert } from 'lucide-react'
import { signPlayerAvatarPath } from '@/lib/players/avatar.server'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchSessionContext } from '@/lib/auth/permissions'
import { PlayerPhotoZoom } from '@/components/player/PlayerPhotoZoom'
import { ProfileForm } from '@/components/profile/ProfileForm'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Editar jogador — FCDA' }

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase()
}

export default async function PlayerProfileSettingsPage() {
  const session = await fetchSessionContext()
  if (!session) redirect('/auth/login')

  const admin = createServiceClient()
  const { data: player, error: playerError } = await admin
    .from('players')
    .select('id, sheet_name, shirt_number, nationality, preferred_positions, avatar_path')
    .eq('profile_id', session.userId)
    .maybeSingle() as {
      data: {
        id: string
        sheet_name: string
        shirt_number: number | null
        nationality: string
        preferred_positions: string[]
        avatar_path: string | null
      } | null
      error: Error | null
    }

  if (playerError) throw playerError

  if (!player) {
    return (
      <div className="container mx-auto max-w-screen-lg px-4 py-8 md:py-10">
        <Card className="border-border/70 shadow-sm">
          <CardContent className="flex flex-col gap-4 p-6 md:p-8">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-fcda-ice text-fcda-navy">
              <ShieldAlert className="size-5" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-fcda-navy">
                Conta ainda sem ligação a jogador
              </h1>
              <p className="max-w-lg text-sm leading-6 text-muted-foreground">
                A tua conta ainda não está ligada a um jogador. Contacta um
                administrador para associar o perfil e desbloquear esta edição.
              </p>
            </div>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/profile" />}
              className="w-fit"
            >
              <ArrowLeft className="size-4" />
              Voltar à conta
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const avatarUrl = await signPlayerAvatarPath(player.avatar_path, true)
  const preferredPositions = player.preferred_positions ?? []

  return (
    <div className="container mx-auto max-w-screen-xl px-4 py-8 md:py-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-gradient-to-br from-fcda-ice/90 via-background to-background shadow-sm">
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-fcda-navy/6 via-transparent to-fcda-gold/15" />
        <div className="relative space-y-6 px-6 py-8 md:px-8 md:py-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <PlayerPhotoZoom
                avatarUrl={avatarUrl}
                displayName={player.sheet_name}
                fallback={getInitials(player.sheet_name)}
                avatarClassName="size-20 border-0 shadow-sm ring-4 ring-background sm:size-24"
                fallbackClassName="text-xl sm:text-2xl"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-muted-foreground">
                  {player.sheet_name}
                </p>
                <h1 className="text-3xl font-semibold tracking-tight text-fcda-navy md:text-4xl">
                  Editar jogador
                </h1>
                <p className="mt-3 text-sm leading-6 text-muted-foreground md:text-base">
                  Atualiza a informação que aparece na tua página pública.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href="/profile" />}
                className="h-10 bg-background/80"
              >
                <ArrowLeft className="size-4" />
                Preferências
              </Button>
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href={`/players/${player.id}`} />}
                className="h-10 border-fcda-navy/15 bg-background/80"
              >
                <ExternalLink className="size-4" />
                O meu jogador
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8">
        <ProfileForm
          playerId={player.id}
          playerName={player.sheet_name}
          sheetName={player.sheet_name}
          shirtNumber={player.shirt_number}
          nationality={player.nationality}
          preferredPositions={preferredPositions}
          avatarUrl={avatarUrl}
        />
      </div>
    </div>
  )
}
