import { redirect } from 'next/navigation'
import { Navbar } from '@/components/layout/Navbar'
import { AdminNav } from '@/components/admin/AdminNav'
import { fetchSessionContext, canAccessAdmin } from '@/lib/auth/permissions'
import { resolveLinkedPlayerIdentity } from '@/lib/players/avatar.server'
import { createServiceClient } from '@/lib/supabase/server'

export default async function AdminLayout({
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

  if (!canAccessAdmin(session.roles)) {
    redirect('/')
  }

  const { count } = await createServiceClient()
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('approved', false)
  const linkedPlayer = await resolveLinkedPlayerIdentity(session.userId, true)

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        profile={session.profile}
        roles={session.roles}
        pendingCount={count ?? 0}
        linkedPlayer={linkedPlayer}
      />
      <main className="flex-1 container max-w-screen-xl mx-auto px-4 py-8">
        <AdminNav />
        <div className="mt-6">
          {children}
        </div>
      </main>
    </div>
  )
}
