'use client'

import { useCallback, useDeferredValue, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Loader2, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NationalityFlag } from '@/components/player/NationalityFlag'
import { cn } from '@/lib/utils'
import type { PlayersListRow } from '@/lib/players/list'

type PlayerRow = PlayersListRow

type Props = {
  players: PlayerRow[]
  isApproved: boolean
  highlightedPlayerId?: string | null
  initialHasMore?: boolean
  pageSize?: number
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)

  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()

  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase()
}

const POSITION_LABELS: Record<string, string> = {
  GK: 'Guarda-redes',
  CB: 'Defesa',
  CM: 'Médio',
  W: 'Extremo',
  ST: 'Avançado',
}

function translateWithFallback(
  t: ReturnType<typeof useTranslation>['t'],
  key: string,
  fallback: string,
  values?: Record<string, string | number>,
) {
  const translated = t(key, values)
  return translated === key ? fallback : translated
}

type PlayersListResponse = {
  players: PlayerRow[]
  hasMore: boolean
  isApproved: boolean
}

export function PlayersTable({
  players,
  isApproved,
  highlightedPlayerId = null,
  initialHasMore = false,
  pageSize = 12,
}: Props) {
  const { t } = useTranslation()
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [searchValue, setSearchValue] = useState('')
  const [rows, setRows] = useState(players)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const deferredSearchValue = useDeferredValue(searchValue)
  const query = deferredSearchValue.trim()

  const fetchPlayers = useCallback(
    async ({
      offset,
      search,
      signal,
    }: {
      offset: number
      search: string
      signal?: AbortSignal
    }) => {
      const params = new URLSearchParams({
        offset: String(offset),
        limit: String(pageSize),
      })

      if (search) {
        params.set('q', search)
      }

      const response = await fetch(`/api/players/list?${params.toString()}`, {
        signal,
      })

      if (!response.ok) {
        throw new Error('Failed to load players')
      }

      return (await response.json()) as PlayersListResponse
    },
    [pageSize],
  )

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    setLoadError(null)

    try {
      const result = await fetchPlayers({
        offset: rows.length,
        search: query,
      })
      setRows((currentRows) => [...currentRows, ...result.players])
      setHasMore(result.hasMore)
    } catch {
      setLoadError(translateWithFallback(t, 'players.loadError', 'Nao foi possivel carregar mais jogadores.'))
    } finally {
      setIsLoading(false)
    }
  }, [fetchPlayers, hasMore, isLoading, query, rows.length, t])

  useEffect(() => {
    if (!query) {
      setRows(players)
      setHasMore(initialHasMore)
      setLoadError(null)
      return
    }

    const controller = new AbortController()
    setIsLoading(true)
    setLoadError(null)

    fetchPlayers({
      offset: 0,
      search: query,
      signal: controller.signal,
    })
      .then((result) => {
        setRows(result.players)
        setHasMore(result.hasMore)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setRows([])
        setHasMore(false)
        setLoadError(translateWithFallback(t, 'players.searchError', 'Nao foi possivel pesquisar jogadores.'))
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      })

    return () => controller.abort()
  }, [fetchPlayers, initialHasMore, players, query, t])

  useEffect(() => {
    if (!hasMore || isLoading || loadError) return

    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMore()
        }
      },
      { rootMargin: '600px 0px' },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, isLoading, loadError, loadMore])

  return (
    <div className="space-y-6">
      <div className="sticky top-20 z-40 -mx-4 border-b border-border bg-background/95 px-4 py-4 backdrop-blur-sm md:-mx-0 md:px-0 supports-[backdrop-filter]:bg-background/80">
        <div className="w-full space-y-1.5">
          <Label htmlFor="player-search">{t('players.nameLabel')}</Label>
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="player-search"
              type="search"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={t('players.searchPlaceholder')}
              className="h-10 w-full rounded-full bg-background pl-9 pr-4"
            />
          </div>
        </div>
      </div>

      {rows.length === 0 && !isLoading ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
          <p className="text-sm text-muted-foreground">{t('stats.noPlayers')}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((player) => {
            const isHighlighted = player.id === highlightedPlayerId
            const shirtNumber =
              player.shirt_number != null
                ? String(player.shirt_number).padStart(2, '0')
                : 'FC'
            const positionLabel =
              player.preferred_positions.length > 0
                ? player.preferred_positions
                    .map((position) =>
                      translateWithFallback(t, `profile.positions.${position}`, POSITION_LABELS[position] ?? position)
                    )
                : [translateWithFallback(t, 'players.genericPlayer', 'Jogador')]

            return (
              <Link
                key={player.id}
                href={`/players/${player.id}`}
                aria-label={translateWithFallback(
                  t,
                  'players.viewProfileAria',
                  `Ver perfil de ${player.display_name}`,
                  { name: player.display_name },
                )}
                className={cn(
                  'group relative block min-h-88 overflow-hidden rounded-none border bg-card text-left shadow-sm shadow-foreground/5 transition-all',
                  'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  'hover:-translate-y-1 hover:border-primary/35 hover:bg-muted/25 hover:shadow-lg hover:shadow-foreground/10',
                  isHighlighted ? 'border-fcda-gold ring-2 ring-fcda-gold/25' : 'border-border'
                )}
              >
                <div className="absolute inset-x-0 top-0 h-px bg-border" />
                <div className="relative z-20 p-6">
                  <p className="text-5xl font-black leading-none text-fcda-gold tabular-nums">
                    {shirtNumber}
                  </p>
                  <div className="mt-3 h-px w-6 bg-border" />
                  <h2 className="mt-3 max-w-[8.5rem] text-xl font-black uppercase leading-tight tracking-tight text-foreground">
                    {player.display_name}
                  </h2>
                  <div className="mt-2 flex flex-col items-start gap-0.5">
                    {positionLabel.map((label) => (
                      <span
                        key={label}
                        className="text-xs font-black uppercase tracking-wide text-fcda-gold"
                      >
                        {label}
                      </span>
                    ))}
                    <NationalityFlag nationality={player.nationality} className="mt-1 h-4 w-6" />
                  </div>
                  {isHighlighted && (
                    <Badge className="mt-4 bg-fcda-gold text-fcda-navy hover:bg-fcda-gold">
                      {translateWithFallback(t, 'players.personalProfile', 'Perfil pessoal')}
                    </Badge>
                  )}
                </div>

                <div className="absolute inset-y-0 right-0 z-10 flex w-[78%] items-end justify-end overflow-hidden">
                  {isApproved && player.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={player.avatar_url}
                      alt=""
                      className="h-full w-full object-cover object-center grayscale-[15%] transition-transform duration-300 group-hover:scale-105"
                      aria-hidden
                    />
                  ) : (
                    <div className="mr-5 flex size-32 items-center justify-center rounded-full border border-border bg-muted text-4xl font-black text-muted-foreground shadow-inner">
                      {getInitials(player.display_name)}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-card via-card/35 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card to-transparent" />
                </div>

                <div className="absolute inset-x-0 bottom-0 z-20 translate-y-full bg-fcda-gold text-white transition-transform duration-300 group-hover:translate-y-0 group-focus-visible:translate-y-0">
                  <div className="px-5 pb-4 pt-3">
                    <p className="text-4xl font-black leading-none tabular-nums">
                      {player.total_all}
                    </p>
                    <p className="mt-1 text-xs font-black uppercase tracking-wide text-white/70">
                      {translateWithFallback(t, 'players.gamesLabel', 'Jogos')}
                    </p>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/25 px-5 py-3">
                    <span className="text-xs font-black uppercase tracking-[0.16em]">
                      {translateWithFallback(t, 'players.biography', 'Biografia')}
                    </span>
                    <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" aria-hidden />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <div ref={sentinelRef} className="flex min-h-12 justify-center">
        {isLoading ? (
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {translateWithFallback(t, 'common.loading', 'A carregar')}
          </div>
        ) : hasMore ? (
          <Button type="button" variant="outline" onClick={loadMore}>
            {translateWithFallback(t, 'players.loadMore', 'Carregar mais')}
          </Button>
        ) : null}
      </div>

      {loadError ? (
        <p className="text-center text-sm text-destructive">{loadError}</p>
      ) : null}
    </div>
  )
}
