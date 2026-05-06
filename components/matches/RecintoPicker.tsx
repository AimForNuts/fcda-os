'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, MapPin, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type RecintoOption = {
  id: string
  name: string
  formatted_address: string | null
  google_place_id: string | null
}

type GooglePrediction = {
  placeId: string
  description: string
  mainText: string
  secondaryText?: string
}

type Props = {
  id: string
  value: string
  recintoId: string | null
  placeholder?: string
  disabled?: boolean
  onChange: (value: { location: string; recintoId: string | null }) => void
}

const MIN_QUERY_LENGTH = 3

export function RecintoPicker({
  id,
  value,
  recintoId,
  placeholder,
  disabled,
  onChange,
}: Props) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [recent, setRecent] = useState<RecintoOption[]>([])
  const [predictions, setPredictions] = useState<GooglePrediction[]>([])
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recentLoaded, setRecentLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRequestRef = useRef(0)
  const detailsRequestRef = useRef(0)

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  useEffect(() => {
    if (!isOpen || recentLoaded) return

    fetch('/api/recintos')
      .then(async (res) => {
        if (!res.ok) return
        const payload = await res.json()
        setRecent(payload.recintos ?? [])
        setRecentLoaded(true)
      })
      .catch(() => {
        // Recent recintos are a convenience; Google search/manual entry still works.
      })
  }, [isOpen, recentLoaded])

  useEffect(() => {
    if (!isOpen || value.trim().length < MIN_QUERY_LENGTH || recintoId) {
      setPredictions([])
      return
    }

    const timeout = window.setTimeout(() => {
      const requestId = searchRequestRef.current + 1
      searchRequestRef.current = requestId
      setLoading(true)
      setError(null)

      fetch('/api/recintos/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: value,
          sessionToken: sessionToken ?? undefined,
        }),
      })
        .then(async (res) => {
          const payload = await res.json().catch(() => ({}))
          if (!res.ok) throw new Error(payload.error || t('matches.recinto.searchError'))
          return payload as { predictions: GooglePrediction[]; sessionToken: string }
        })
        .then((payload) => {
          if (searchRequestRef.current !== requestId) return
          setPredictions(payload.predictions ?? [])
          setSessionToken(payload.sessionToken)
        })
        .catch((err) => {
          if (searchRequestRef.current !== requestId) return
          setPredictions([])
          setError(err instanceof Error ? err.message : t('matches.recinto.searchError'))
        })
        .finally(() => {
          if (searchRequestRef.current === requestId) setLoading(false)
        })
    }, 350)

    return () => window.clearTimeout(timeout)
  }, [isOpen, recintoId, sessionToken, t, value])

  function selectRecent(recinto: RecintoOption) {
    onChange({ location: recinto.name, recintoId: recinto.id })
    setPredictions([])
    setError(null)
    setIsOpen(false)
  }

  async function selectPrediction(prediction: GooglePrediction) {
    const requestId = detailsRequestRef.current + 1
    detailsRequestRef.current = requestId
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/recintos/details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId: prediction.placeId,
          sessionToken: sessionToken ?? undefined,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || t('matches.recinto.loadError'))
      if (detailsRequestRef.current !== requestId) return

      const recinto = payload.recinto as RecintoOption
      onChange({ location: recinto.name, recintoId: recinto.id })
      setRecent((items) => [recinto, ...items.filter((item) => item.id !== recinto.id)].slice(0, 15))
      setPredictions([])
      setSessionToken(null)
      setIsOpen(false)
    } catch (err) {
      if (detailsRequestRef.current === requestId) {
        setError(err instanceof Error ? err.message : t('matches.recinto.loadError'))
      }
    } finally {
      if (detailsRequestRef.current === requestId) setLoading(false)
    }
  }

  const filteredRecent = recent.filter((recinto) => {
    const query = value.trim().toLowerCase()
    if (!query) return true
    return recinto.name.toLowerCase().includes(query)
      || recinto.formatted_address?.toLowerCase().includes(query)
  })

  const showRecent = filteredRecent.length > 0
  const showGoogle = predictions.length > 0

  return (
    <div ref={containerRef} className="space-y-2">
      <div className="relative">
        <Input
          id={id}
          type="text"
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            onChange({ location: event.target.value, recintoId: null })
            setIsOpen(true)
          }}
        />
        {loading ? (
          <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />
        ) : (
          <Search className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        )}
      </div>

      {isOpen && (showRecent || showGoogle || error) ? (
        <div className="max-h-72 w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-sm">
          {showRecent ? (
            <div>
              <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{t('matches.recinto.recent')}</p>
              {filteredRecent.map((recinto) => (
                <button
                  key={recinto.id}
                  type="button"
                  className={cn(
                    'flex w-full min-w-0 items-start gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                    recinto.id === recintoId && 'bg-accent text-accent-foreground',
                  )}
                  onClick={() => selectRecent(recinto)}
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{recinto.name}</span>
                    {recinto.formatted_address ? (
                      <span className="block truncate text-xs text-muted-foreground">{recinto.formatted_address}</span>
                    ) : null}
                  </span>
                  {recinto.id === recintoId ? (
                    <Check className="mt-0.5 size-4 shrink-0 text-fcda-blue" aria-hidden />
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}

          {showGoogle ? (
            <div className={showRecent ? 'mt-1 border-t border-border pt-1' : undefined}>
              <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{t('matches.recinto.googleMaps')}</p>
              {predictions.map((prediction) => (
                <button
                  key={prediction.placeId}
                  type="button"
                  className="flex w-full min-w-0 items-start gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={() => selectPrediction(prediction)}
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{prediction.mainText}</span>
                    {prediction.secondaryText ? (
                      <span className="block truncate text-xs text-muted-foreground">{prediction.secondaryText}</span>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {error ? <p className="px-2 py-2 text-xs text-destructive">{error}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
