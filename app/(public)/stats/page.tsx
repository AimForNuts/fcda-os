import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { fetchSessionContext } from '@/lib/auth/permissions'
import {
  resolveLinkedPlayerIdentity,
  signPlayerAvatarRecords,
} from '@/lib/players/avatar.server'
import { StatsTable } from '@/components/stats/StatsTable'

export const metadata = { title: 'Estatísticas — FCDA' }

export default async function StatsPage() {
  const supabase = await createClient()
  const session = await fetchSessionContext()
  const isApproved = session?.profile?.approved ?? false
  const linkedPlayer = session
    ? await resolveLinkedPlayerIdentity(session.userId, isApproved)
    : null

  const { data: players } = await supabase
    .from('player_stats')
    .select('id, display_name, shirt_number, profile_id, avatar_path, total_all, total_comp, wins_all, draws_all, losses_all, wins_comp, draws_comp, losses_comp')
  const rows = await signPlayerAvatarRecords(players ?? [], isApproved)

  return (
    <div className="bg-white">
      <section className="bg-fcda-navy text-white">
        <div className="container mx-auto grid max-w-screen-xl gap-8 px-4 py-10 md:grid-cols-[1fr_auto] md:items-end md:py-14">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-fcda-gold">
              Futebol Clube Dragões da Areosa
            </p>
            <h1 className="mt-3 text-5xl font-black uppercase tracking-tight md:text-7xl">
              Estatísticas
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 md:text-base">
              Analisa jogos, vitórias e registos competitivos de cada jogador do plantel.
            </p>
          </div>
          <Image
            src="/crest.png"
            alt=""
            width={160}
            height={160}
            className="hidden h-40 w-40 object-contain opacity-90 drop-shadow-lg md:block"
            aria-hidden
          />
        </div>
      </section>

      <main className="container mx-auto max-w-screen-md px-4 py-8 md:py-10">
        <StatsTable
          players={rows}
          isAnonymised={!isApproved}
          highlightedPlayerId={linkedPlayer?.id ?? null}
        />
      </main>
    </div>
  )
}
