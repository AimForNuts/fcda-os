import { Handshake, Medal } from 'lucide-react'
import type { LucideProps } from 'lucide-react'

/** Medal — used sitewide for competitive (counts-for-stats) matches. */
export function CompetitiveGameIcon(props: LucideProps) {
  return <Medal {...props} />
}

/** Handshake — used sitewide for friendly matches. */
export function FriendlyGameIcon(props: LucideProps) {
  return <Handshake {...props} />
}
