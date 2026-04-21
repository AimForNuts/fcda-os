import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Hash, ShieldAlert, Sparkles } from 'lucide-react'
import { signPlayerAvatarPath } from '@/lib/players/avatar.server'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchSessionContext } from '@/lib/auth/permissions'
import { ProfileForm } from '@/components/profile/ProfileForm'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

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
  const preferredPositions = player?.preferred_positions ?? []
  const profileStats = player
    ? [
        {
          label: 'Número',
          value: player.shirt_number != null ? `#${player.shirt_number}` : 'Por definir',
          icon: Hash,
        },
        {
          label: 'Posições',
          value: preferredPositions.length > 0
            ? preferredPositions.join(' · ')
            : 'Sem seleção',
          icon: Sparkles,
        },
      ]
    : []

  return (
    <div className="container mx-auto max-w-screen-xl px-4 py-8 md:py-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-gradient-to-br from-fcda-ice/90 via-background to-background shadow-sm">
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-fcda-navy/6 via-transparent to-fcda-gold/15" />
        <div className="absolute -right-12 top-10 h-40 w-40 rounded-full bg-fcda-gold/10 blur-3xl" />
        <div className="absolute left-8 top-20 h-32 w-32 rounded-full bg-fcda-navy/8 blur-3xl" />
        <div className="relative space-y-8 px-6 py-8 md:px-8 md:py-10">
          <div className="space-y-4">
            <Badge
              variant="outline"
              className="border-fcda-navy/15 bg-background/80 text-fcda-navy backdrop-blur"
            >
              Área pessoal
            </Badge>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <h1 className="text-3xl font-semibold tracking-tight text-fcda-navy md:text-4xl">
                  O meu perfil
                </h1>
              </div>
              {player ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[28rem]">
                  {profileStats.map((item) => {
                    const Icon = item.icon
                    return (
                      <div
                        key={item.label}
                        className="rounded-2xl border border-border/70 bg-background/75 p-4 shadow-sm backdrop-blur"
                      >
                        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          <Icon className="size-3.5 text-fcda-navy" />
                          {item.label}
                        </div>
                        <p className="text-sm font-semibold text-fcda-navy md:text-base">
                          {item.value}
                        </p>
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8">
        {player ? (
          <ProfileForm
            playerName={player.sheet_name}
            sheetName={player.sheet_name}
            shirtNumber={player.shirt_number}
            preferredPositions={preferredPositions}
            avatarUrl={avatarUrl}
          />
        ) : (
          <Card className="border-border/70 shadow-sm">
            <CardContent className="flex flex-col gap-4 p-6 md:p-8">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-fcda-ice text-fcda-navy">
                <ShieldAlert className="size-5" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-fcda-navy">
                  Conta ainda sem ligação a jogador
                </h2>
                <p className="max-w-lg text-sm leading-6 text-muted-foreground">
                  A tua conta ainda não está ligada a um jogador. Contacta um
                  administrador para associar o perfil e desbloquear a edição desta
                  página.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
