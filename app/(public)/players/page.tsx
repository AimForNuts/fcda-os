import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchSessionContext } from '@/lib/auth/permissions'
import { signPlayerAvatarRecords } from '@/lib/players/avatar.server'
import { PlayerIdentity } from '@/components/player/PlayerIdentity'
import type { PlayerPublic } from '@/types'

export const metadata = { title: 'Jogadores — FCDA' }

export default async function PlayersPage() {
  const session = await fetchSessionContext()

  if (!session) {
    redirect('/auth/login?redirectTo=/players')
  }

  const supabase = await createClient()
  const isApproved = session.profile.approved

  const { data: players } = await supabase
    .from('players_public')
    .select('id, display_name, shirt_number, current_rating, avatar_path')
    .order('shirt_number', { ascending: true, nullsFirst: false })
    .order('display_name', { ascending: true }) as { data: PlayerPublic[] | null; error: unknown }
  const rows = await signPlayerAvatarRecords(players ?? [], isApproved)

  return (
    <div className="container max-w-screen-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-fcda-navy mb-6">Jogadores</h1>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">Sem jogadores registados.</p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-fcda-navy text-white text-xs uppercase tracking-wide">
                <th className="px-4 py-2.5 text-left font-semibold">#</th>
                <th className="px-4 py-2.5 text-left font-semibold">Nome</th>
                <th className="px-4 py-2.5 text-right font-semibold">Nota</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p, i) => (
                <tr
                  key={p.id}
                  className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}
                >
                  <td className="px-4 py-2.5 text-muted-foreground tabular-nums">
                    {p.shirt_number ?? '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <PlayerIdentity
                      name={p.display_name}
                      href={isApproved ? `/players/${p.id}` : undefined}
                      avatarUrl={p.avatar_url}
                      showAvatar={isApproved}
                      avatarSize="sm"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                    {p.current_rating != null ? p.current_rating.toFixed(1) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
