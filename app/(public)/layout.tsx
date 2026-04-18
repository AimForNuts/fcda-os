import { Navbar } from '@/components/layout/Navbar'
import { fetchSessionContext } from '@/lib/auth/permissions'
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

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        profile={session?.profile ?? null}
        roles={session?.roles ?? []}
        pendingCount={count ?? 0}
      />
      <main className="flex-1">{children}</main>
    </div>
  )
}
