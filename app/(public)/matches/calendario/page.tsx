import { MatchesPageContent, type MatchesSearchParams } from '../MatchesPageContent'

export const metadata = { title: 'Calendário — FCDA' }

export default function MatchesCalendarPage({
  searchParams,
}: {
  searchParams: MatchesSearchParams
}) {
  return <MatchesPageContent activeView="calendar" searchParams={searchParams} />
}
