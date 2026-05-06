import type { Recinto } from '@/types'

export function buildGoogleMapsUrl(input: {
  name: string
  google_place_id?: string | null
  latitude?: number | null
  longitude?: number | null
}) {
  const params = new URLSearchParams({ api: '1' })

  if (input.latitude != null && input.longitude != null) {
    params.set('query', `${input.latitude},${input.longitude}`)
  } else {
    params.set('query', input.name)
  }

  if (input.google_place_id) {
    params.set('query_place_id', input.google_place_id)
  }

  return `https://www.google.com/maps/search/?${params.toString()}`
}

export function getRecintoMapsUrl(recinto: Pick<Recinto, 'name' | 'google_place_id' | 'latitude' | 'longitude' | 'maps_url'> | null | undefined) {
  if (!recinto) return null
  return recinto.maps_url || buildGoogleMapsUrl(recinto)
}
