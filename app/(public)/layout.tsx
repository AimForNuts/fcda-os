import { Suspense } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { fetchSessionContext } from '@/lib/auth/permissions'
import { countPendingFeedbackGames } from '@/lib/matches/pending-feedback'
import { resolveLinkedPlayerIdentity } from '@/lib/players/avatar.server'
import { createServiceClient } from '@/lib/supabase/server'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Suspense fallback={<Navbar profile={null} roles={[]} pendingCount={0} />}>
        <PublicNavbar />
      </Suspense>
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  )
}

async function PublicNavbar() {
  const session = await fetchSessionContext()

  const isAdmin = session?.roles.includes('admin') ?? false
  const pendingProfilesPromise = isAdmin
    ? createServiceClient()
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('approved', false)
    : Promise.resolve({ count: 0 })
  const linkedPlayerPromise = session
    ? resolveLinkedPlayerIdentity(session.userId, session.profile.approved)
    : Promise.resolve(null)

  const [{ count }, linkedPlayer] = await Promise.all([
    pendingProfilesPromise,
    linkedPlayerPromise,
  ])

  const pendingFeedbackCount =
    session?.profile.approved && linkedPlayer
      ? await countPendingFeedbackGames({
          userId: session.userId,
          linkedPlayerId: linkedPlayer.id,
        })
      : 0

  return (
    <Navbar
      profile={session?.profile ?? null}
      roles={session?.roles ?? []}
      pendingCount={count ?? 0}
      pendingFeedbackCount={pendingFeedbackCount}
      linkedPlayer={linkedPlayer}
    />
  )
}
