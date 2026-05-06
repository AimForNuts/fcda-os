import { randomUUID } from 'node:crypto'
import { buildGoogleMapsUrl } from '@/lib/recintos/google-maps'

const GOOGLE_MAPS_API_BASE = 'https://maps.googleapis.com/maps/api'
const AUTOCOMPLETE_URL = `${GOOGLE_MAPS_API_BASE}/place/autocomplete/json`
const DETAILS_URL = `${GOOGLE_MAPS_API_BASE}/place/details/json`

const AUTOCOMPLETE_CACHE_TTL_MS = 5 * 60 * 1000
const AUTOCOMPLETE_CACHE_MAX_ENTRIES = 500
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX = Number(process.env.RECINTO_SEARCH_RATE_LIMIT || 30)

type CacheEntry<T> = { expiresAt: number; data: T }
type RateLimitEntry = { windowStart: number; count: number }

const autocompleteCache = new Map<string, CacheEntry<GooglePlacePrediction[]>>()
const userRateLimit = new Map<string, RateLimitEntry>()

type GoogleAutocompletePrediction = {
  place_id: string
  description: string
  structured_formatting?: {
    main_text?: string
    secondary_text?: string
  }
  types?: string[]
}

type GooglePlaceDetailsResult = {
  place_id: string
  name?: string
  formatted_address?: string
  geometry?: { location?: { lat?: number; lng?: number } }
}

export type GooglePlacePrediction = {
  placeId: string
  description: string
  mainText: string
  secondaryText?: string
  types?: string[]
}

export type GooglePlaceDetails = {
  placeId: string
  name: string
  formattedAddress?: string
  latitude?: number
  longitude?: number
  mapsUrl: string
}

export class GooglePlacesError extends Error {
  status: number

  constructor(message: string, status = 500) {
    super(message)
    this.status = status
  }
}

function getApiKey() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) throw new GooglePlacesError('Google Maps API key is not configured.', 503)
  return apiKey
}

function getSessionToken(sessionToken?: string) {
  return sessionToken || randomUUID()
}

function pruneAutocompleteCache(now: number) {
  for (const [key, entry] of autocompleteCache) {
    if (entry.expiresAt <= now) autocompleteCache.delete(key)
  }

  while (autocompleteCache.size > AUTOCOMPLETE_CACHE_MAX_ENTRIES) {
    const oldestKey = autocompleteCache.keys().next().value
    if (!oldestKey) break
    autocompleteCache.delete(oldestKey)
  }
}

export function enforceGooglePlacesRateLimit(userId: string) {
  const now = Date.now()
  for (const [key, entry] of userRateLimit) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) userRateLimit.delete(key)
  }

  const entry = userRateLimit.get(userId)
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    userRateLimit.set(userId, { windowStart: now, count: 1 })
    return
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    throw new GooglePlacesError('Limite de pesquisas atingido. Tenta novamente dentro de um minuto.', 429)
  }

  entry.count += 1
}

async function fetchGooglePayload(url: URL) {
  const response = await fetch(url, { headers: { 'Accept-Encoding': 'gzip' } })
  if (!response.ok) {
    throw new GooglePlacesError(`Google Maps request failed with status ${response.status}`)
  }

  const payload = await response.json()
  if (payload.error_message) {
    throw new GooglePlacesError(`Google Maps error: ${payload.error_message}`)
  }

  if (!['OK', 'ZERO_RESULTS'].includes(payload.status)) {
    throw new GooglePlacesError(`Google Maps error status: ${payload.status}`)
  }

  return payload
}

export async function getGooglePlacePredictions(params: {
  query: string
  userId: string
  sessionToken?: string
  country?: string
  language?: string
  limit?: number
}) {
  const {
    query,
    userId,
    sessionToken,
    country = 'pt',
    language = 'pt',
    limit = 5,
  } = params
  const trimmedQuery = query.trim()
  if (trimmedQuery.length < 3) {
    throw new GooglePlacesError('O termo de pesquisa deve ter pelo menos 3 caracteres.', 400)
  }

  enforceGooglePlacesRateLimit(userId)

  const cacheKey = `${country}:${language}:${trimmedQuery.toLowerCase()}`
  const now = Date.now()
  const cached = autocompleteCache.get(cacheKey)
  const token = getSessionToken(sessionToken)
  if (cached && cached.expiresAt > now) {
    return { predictions: cached.data.slice(0, limit), sessionToken: token }
  }

  const url = new URL(AUTOCOMPLETE_URL)
  url.searchParams.set('input', trimmedQuery)
  url.searchParams.set('key', getApiKey())
  url.searchParams.set('language', language)
  url.searchParams.set('components', `country:${country}`)
  url.searchParams.set('sessiontoken', token)

  const payload = await fetchGooglePayload(url)
  const predictions = ((payload.predictions || []) as GoogleAutocompletePrediction[]).map((prediction) => ({
    placeId: prediction.place_id,
    description: prediction.description,
    mainText: prediction.structured_formatting?.main_text || prediction.description,
    secondaryText: prediction.structured_formatting?.secondary_text,
    types: prediction.types,
  }))

  autocompleteCache.set(cacheKey, { expiresAt: now + AUTOCOMPLETE_CACHE_TTL_MS, data: predictions })
  pruneAutocompleteCache(now)

  return { predictions: predictions.slice(0, limit), sessionToken: token }
}

export async function getGooglePlaceDetails(params: {
  placeId: string
  sessionToken?: string
  language?: string
}) {
  const { placeId, sessionToken, language = 'pt' } = params
  if (!placeId) throw new GooglePlacesError('O identificador do recinto é obrigatório.', 400)

  const url = new URL(DETAILS_URL)
  url.searchParams.set('place_id', placeId)
  url.searchParams.set('key', getApiKey())
  url.searchParams.set('language', language)
  url.searchParams.set('fields', 'name,formatted_address,geometry,place_id')
  if (sessionToken) url.searchParams.set('sessiontoken', sessionToken)

  const payload = await fetchGooglePayload(url)
  const result = payload.result as GooglePlaceDetailsResult | undefined
  if (!result) throw new GooglePlacesError('Recinto não encontrado.', 404)

  const name = result.name || result.formatted_address || result.place_id
  const latitude = result.geometry?.location?.lat
  const longitude = result.geometry?.location?.lng

  return {
    placeId: result.place_id,
    name,
    formattedAddress: result.formatted_address,
    latitude,
    longitude,
    mapsUrl: buildGoogleMapsUrl({
      name,
      google_place_id: result.place_id,
      latitude,
      longitude,
    }),
  } satisfies GooglePlaceDetails
}
