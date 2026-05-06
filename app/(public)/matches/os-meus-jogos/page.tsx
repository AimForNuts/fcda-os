import { MatchesPageContent, type MatchesSearchParams } from '../MatchesPageContent'

export const metadata = { title: 'Os meus jogos — FCDA' }

export default function MyMatchesPage({
  searchParams,
}: {
  searchParams: MatchesSearchParams
}) {
  return <MatchesPageContent activeView="mine" searchParams={searchParams} />
}
