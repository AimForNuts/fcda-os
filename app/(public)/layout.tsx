import { Navbar } from '@/components/layout/Navbar'
import { fetchSessionContext } from '@/lib/auth/permissions'

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await fetchSessionContext()

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        profile={session?.profile ?? null}
        roles={session?.roles ?? []}
      />
      <main className="flex-1">{children}</main>
    </div>
  )
}
