import { redirect } from 'next/navigation'
import { Navbar } from '@/components/layout/Navbar'
import { fetchSessionContext, canAccessMod } from '@/lib/auth/permissions'

export default async function ModLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await fetchSessionContext()

  if (!session || !session.profile.approved) {
    redirect('/auth/login')
  }

  if (!canAccessMod(session.roles)) {
    redirect('/')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar profile={session.profile} roles={session.roles} />
      <main className="flex-1 container max-w-screen-xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
