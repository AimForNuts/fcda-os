import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/layout/Navbar'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { fetchSessionContext } from '@/lib/auth/permissions'
import { countPendingFeedbackGames } from '@/lib/matches/pending-feedback'
import { resolveLinkedPlayerIdentity } from '@/lib/players/avatar.server'
import { createServiceClient } from '@/lib/supabase/server'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await fetchSessionContext()

  if (!session) {
    redirect('/auth/login')
  }

  if (!session.profile.approved) {
    redirect('/auth/pending')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Suspense
        fallback={
          <Navbar
            profile={session.profile}
            roles={session.roles}
            pendingCount={0}
          />
        }
      >
        <AuthenticatedNavbar session={session} />
      </Suspense>
      <main className="flex-1 container max-w-screen-xl mx-auto px-4 py-8">
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}

async function AuthenticatedNavbar({
  session,
}: {
  session: NonNullable<Awaited<ReturnType<typeof fetchSessionContext>>>
}) {
  const isAdmin = session.roles.includes('admin')
  const { count } = isAdmin
    ? await createServiceClient()
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('approved', false)
    : { count: 0 }
  const linkedPlayer = await resolveLinkedPlayerIdentity(session.userId, true)
  const pendingFeedbackCount = await countPendingFeedbackGames({
    userId: session.userId,
    linkedPlayerId: linkedPlayer?.id,
  })

  return (
    <Navbar
      profile={session.profile}
      roles={session.roles}
      pendingCount={count ?? 0}
      pendingFeedbackCount={pendingFeedbackCount}
      linkedPlayer={linkedPlayer}
    />
  )
}
