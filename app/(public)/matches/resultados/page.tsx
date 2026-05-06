import { MatchesPageContent, type MatchesSearchParams } from '../MatchesPageContent'

export const metadata = { title: 'Resultados — FCDA' }

export default function MatchesResultsPage({
  searchParams,
}: {
  searchParams: MatchesSearchParams
}) {
  return <MatchesPageContent activeView="results" searchParams={searchParams} />
}
