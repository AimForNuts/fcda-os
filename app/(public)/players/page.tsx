import { redirect } from 'next/navigation'
import { fetchSessionContext } from '@/lib/auth/permissions'
import { fetchPlayersList, PLAYERS_PAGE_SIZE } from '@/lib/players/list'
import { PlayersPageHero } from '@/components/player/PlayersPageHero'
import { PlayersTable } from '@/components/player/PlayersTable'

export const metadata = { title: 'Squad - FCDA' }

export default async function PlayersPage() {
  const session = await fetchSessionContext()

  if (!session) {
    redirect('/auth/login?redirectTo=/players')
  }

  const { players, hasMore, highlightedPlayerId, isApproved } = await fetchPlayersList({
    session,
    limit: PLAYERS_PAGE_SIZE,
    includeHighlight: true,
  })

  return (
    <div className="bg-background">
      <PlayersPageHero />

      <main className="container mx-auto max-w-screen-xl px-4 py-8 md:py-10">
        <PlayersTable
          players={players}
          isApproved={isApproved}
          highlightedPlayerId={highlightedPlayerId}
          initialHasMore={hasMore}
          pageSize={PLAYERS_PAGE_SIZE}
        />
      </main>
    </div>
  )
}
