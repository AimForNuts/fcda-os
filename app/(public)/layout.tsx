import { Navbar } from '@/components/layout/Navbar'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { fetchSessionContext } from '@/lib/auth/permissions'
import { countPendingFeedbackGames } from '@/lib/matches/pending-feedback'
import { resolveLinkedPlayerIdentity } from '@/lib/players/avatar.server'
import { createServiceClient } from '@/lib/supabase/server'

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await fetchSessionContext()

  const isAdmin = session?.roles.includes('admin') ?? false
  const { count } = isAdmin
    ? await createServiceClient()
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('approved', false)
    : { count: 0 }
  const linkedPlayer = session
    ? await resolveLinkedPlayerIdentity(session.userId, session.profile.approved)
    : null
  const pendingFeedbackCount = session?.profile.approved
    ? await countPendingFeedbackGames({
        userId: session.userId,
        linkedPlayerId: linkedPlayer?.id,
      })
    : 0

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        profile={session?.profile ?? null}
        roles={session?.roles ?? []}
        pendingCount={count ?? 0}
        pendingFeedbackCount={pendingFeedbackCount}
        linkedPlayer={linkedPlayer}
      />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  )
}
