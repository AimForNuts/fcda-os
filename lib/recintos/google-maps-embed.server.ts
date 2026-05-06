import 'server-only'
import type { Recinto } from '@/types'

type RecintoMapSource = Pick<
  Recinto,
  'name' | 'google_place_id' | 'formatted_address' | 'latitude' | 'longitude'
> | null | undefined

function getMapQuery(recinto: RecintoMapSource, fallbackLocation: string) {
  if (recinto?.latitude != null && recinto.longitude != null) {
    return `${recinto.latitude},${recinto.longitude}`
  }

  return [recinto?.name || fallbackLocation, recinto?.formatted_address]
    .filter(Boolean)
    .join(', ')
}

export function getRecintoMapEmbedUrl(
  recinto: RecintoMapSource,
  fallbackLocation: string,
) {
  const query = getMapQuery(recinto, fallbackLocation).trim()

  if (!query) return null

  const params = new URLSearchParams({
    q: query,
    z: '16',
    output: 'embed',
  })

  return `https://www.google.com/maps?${params.toString()}`
}
