import { ExternalLink } from 'lucide-react'
import { getRecintoMapsUrl } from '@/lib/recintos/google-maps'
import type { Recinto } from '@/types'

type Props = {
  location: string
  recinto?: Pick<Recinto, 'name' | 'google_place_id' | 'latitude' | 'longitude' | 'maps_url'> | null
  className?: string
}

export function RecintoLink({ location, recinto, className }: Props) {
  const mapsUrl = getRecintoMapsUrl(recinto)

  if (!mapsUrl) return <span className={className}>{location}</span>

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      <span className="truncate">{location}</span>
      <ExternalLink className="size-3.5 shrink-0" aria-hidden />
    </a>
  )
}
