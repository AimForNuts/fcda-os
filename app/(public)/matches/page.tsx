import { redirect } from 'next/navigation'

export const metadata = { title: 'Jogos — FCDA' }

function appendDateFilters(path: string, from?: string, to?: string) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const query = params.toString()
  return query ? `${path}?${query}` : path
}

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; view?: string }>
}) {
  const { from, to, view } = await searchParams
  const target = view === 'results'
    ? '/matches/resultados'
    : view === 'mine'
      ? '/matches/os-meus-jogos'
      : '/matches/calendario'

  redirect(appendDateFilters(target, from, to))
}
