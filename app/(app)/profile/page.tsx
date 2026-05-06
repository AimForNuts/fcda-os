import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { CalendarDays, ExternalLink, ShieldAlert } from 'lucide-react'
import { signPlayerAvatarPath } from '@/lib/players/avatar.server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { fetchSessionContext } from '@/lib/auth/permissions'
import { createPlayerCalendarToken } from '@/lib/calendar/token'
import { PlayerPhotoZoom } from '@/components/player/PlayerPhotoZoom'
import { AccountForm } from '@/components/profile/AccountForm'
import { CalendarSyncField } from '@/components/profile/CalendarSyncField'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Conta — FCDA' }

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase()
}

function getOrigin(headerList: Headers) {
  const forwardedHost = headerList.get('x-forwarded-host')
  const host = forwardedHost ?? headerList.get('host')

  if (!host) return ''

  const forwardedProto = headerList.get('x-forwarded-proto')
  const protocol = forwardedProto ?? (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https')

  return `${protocol}://${host}`
}

function calendarSubscriptionUrl(origin: string, playerId?: string) {
  const path = '/api/calendar/games.ics'
  const baseUrl = origin ? `${origin}${path}` : path

  if (!playerId) return baseUrl

  const params = new URLSearchParams({
    player_id: createPlayerCalendarToken(playerId),
  })

  return `${baseUrl}?${params.toString()}`
}

export default async function ProfilePage() {
  const session = await fetchSessionContext()
  if (!session) redirect('/auth/login')
  const headerList = await headers()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const admin = createServiceClient()
  const { data: player, error: playerError } = await admin
    .from('players')
    .select('id, sheet_name, avatar_path')
    .eq('profile_id', session.userId)
    .maybeSingle() as {
      data: { id: string; sheet_name: string; avatar_path: string | null } | null
      error: Error | null
    }

  if (playerError) throw playerError
  const displayName = player?.sheet_name ?? session.profile.display_name
  const avatarUrl = player ? await signPlayerAvatarPath(player.avatar_path, true) : null
  const origin = getOrigin(headerList)
  const allGamesCalendarUrl = calendarSubscriptionUrl(origin)
  const playerCalendarUrl = player ? calendarSubscriptionUrl(origin, player.id) : null
  const isLocalCalendarUrl = origin.includes('localhost') || origin.includes('127.0.0.1')

  return (
    <div className="container mx-auto max-w-screen-lg px-4 py-8 md:py-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-gradient-to-br from-fcda-ice/90 via-background to-background shadow-sm">
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-fcda-navy/6 via-transparent to-fcda-gold/15" />
        <div className="relative space-y-6 px-6 py-8 md:px-8 md:py-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <PlayerPhotoZoom
                avatarUrl={avatarUrl}
                displayName={displayName}
                fallback={getInitials(displayName)}
                avatarClassName="size-20 border-0 shadow-sm ring-4 ring-background sm:size-24"
                fallbackClassName="text-xl sm:text-2xl"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-muted-foreground">
                  {displayName}
                </p>
                <h1 className="text-3xl font-semibold tracking-tight text-fcda-navy md:text-4xl">
                  Conta
                </h1>
                <p className="mt-3 text-sm leading-6 text-muted-foreground md:text-base">
                  Gere os teus dados de acesso e identificação na aplicação.
                </p>
              </div>
            </div>
            <div className="inline-flex w-fit items-center rounded-full border border-border/70 bg-background/75 px-4 py-2 text-sm font-medium text-fcda-navy shadow-sm backdrop-blur">
              {user?.email ?? 'Email não disponível'}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8 space-y-6">
        <AccountForm
          displayName={session.profile.display_name}
          email={user?.email ?? ''}
        />

        {player ? (
          <Card className="border-border/70 shadow-sm">
            <CardContent className="flex flex-col justify-between gap-5 p-6 md:flex-row md:items-center md:p-8">
              <div>
                <h2 className="text-xl font-semibold text-fcda-navy">
                  Página de jogador
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Edita os dados públicos de {player.sheet_name} numa página separada.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link href={`/players/${player.id}`} />}
                >
                  <ExternalLink className="size-4" />
                  Ver página pública
                </Button>
                <Button
                  nativeButton={false}
                  render={<Link href="/profile/player" />}
                  className="bg-fcda-navy text-white hover:bg-fcda-navy/90"
                >
                  Editar página de jogador
                </Button>
              </div>
            </CardContent>
          </Card>
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
                  administrador para associar o perfil.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-border/70 shadow-sm">
          <CardContent className="space-y-5 p-6 md:p-8">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-fcda-ice text-fcda-navy">
                <CalendarDays className="size-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-fcda-navy">
                  Sincronização de calendário
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Copia o URL ICS para subscrever no teu calendário.
                </p>
                {isLocalCalendarUrl ? (
                  <p className="mt-2 text-sm leading-6 text-amber-700">
                    Calendários externos, como Google Calendar, não conseguem aceder a localhost.
                    Usa este URL a partir da versão publicada em produção.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-4">
              {playerCalendarUrl ? (
                <CalendarSyncField
                  id="player-calendar-url"
                  label="Os meus jogos"
                  value={playerCalendarUrl}
                />
              ) : null}

              <CalendarSyncField
                id="all-games-calendar-url"
                label="Todos os jogos"
                value={allGamesCalendarUrl}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
