'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { PlayerPublic } from '@/types'

type PlayerRow = Omit<PlayerPublic, 'current_rating' | 'description'> & {
  avatar_url?: string | null
  preferred_positions: string[]
  total_all: number
}

type Props = {
  players: PlayerRow[]
  isApproved: boolean
  highlightedPlayerId?: string | null
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

export function PlayersTable({ players, isApproved, highlightedPlayerId = null }: Props) {
  const { t } = useTranslation()
  const [searchValue, setSearchValue] = useState('')
  const deferredSearchValue = useDeferredValue(searchValue)

  const filteredPlayers = useMemo(() => {
    const normalize = (s: string) =>
      s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-PT')
    const query = normalize(deferredSearchValue.trim())

    return players.filter((player) => {
      return !query || normalize(player.display_name).includes(query)
    })
  }, [deferredSearchValue, players])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-fcda-navy/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5 sm:max-w-sm">
          <Label htmlFor="player-search">{t('players.nameLabel')}</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="player-search"
              type="search"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={t('players.searchPlaceholder')}
              className="h-10 rounded-full bg-white pl-9 pr-4"
            />
          </div>
        </div>
        <p className="text-sm font-medium text-muted-foreground">
          {filteredPlayers.length} / {players.length} jogadores
        </p>
      </div>

      {filteredPlayers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-fcda-navy/20 bg-muted/20 p-8 text-center">
          <p className="text-sm text-muted-foreground">{t('stats.noPlayers')}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredPlayers.map((player) => {
            const isHighlighted = player.id === highlightedPlayerId
            const shirtNumber =
              player.shirt_number != null
                ? String(player.shirt_number).padStart(2, '0')
                : 'FC'
            const positionLabel =
              player.preferred_positions.length > 0
                ? player.preferred_positions
                    .map((position) => POSITION_LABELS[position] ?? position)
                : ['Jogador']

            return (
              <Link
                key={player.id}
                href={`/players/${player.id}`}
                aria-label={`Ver perfil de ${player.display_name}`}
                className={cn(
                  'group relative block min-h-88 overflow-hidden rounded-none border bg-[#f4f6f8] text-left shadow-sm shadow-fcda-navy/5 transition-all',
                  'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  'hover:-translate-y-1 hover:border-fcda-navy/30 hover:bg-white hover:shadow-lg hover:shadow-fcda-navy/10',
                  isHighlighted ? 'border-fcda-gold ring-2 ring-fcda-gold/25' : 'border-fcda-navy/10'
                )}
              >
                <div className="absolute inset-x-0 top-0 h-px bg-fcda-navy/10" />
                <div className="relative z-20 p-6">
                  <p className="text-5xl font-black leading-none text-fcda-gold tabular-nums">
                    {shirtNumber}
                  </p>
                  <div className="mt-3 h-px w-6 bg-fcda-navy/15" />
                  <h2 className="mt-3 max-w-[8.5rem] text-xl font-black uppercase leading-tight tracking-tight text-fcda-navy">
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
                  </div>
                  {isHighlighted && (
                    <Badge className="mt-4 bg-fcda-gold text-fcda-navy hover:bg-fcda-gold">
                      Perfil pessoal
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
                    <div className="mr-5 flex size-32 items-center justify-center rounded-full border border-fcda-navy/10 bg-white text-4xl font-black text-fcda-navy/30 shadow-inner">
                      {getInitials(player.display_name)}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#f4f6f8] via-[#f4f6f8]/35 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#f4f6f8] to-transparent" />
                </div>

                <div className="absolute inset-x-0 bottom-0 z-20 translate-y-full bg-fcda-gold text-white transition-transform duration-300 group-hover:translate-y-0 group-focus-visible:translate-y-0">
                  <div className="px-5 pb-4 pt-3">
                    <p className="text-4xl font-black leading-none tabular-nums">
                      {player.total_all}
                    </p>
                    <p className="mt-1 text-xs font-black uppercase tracking-wide text-white/70">
                      Jogos
                    </p>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/25 px-5 py-3">
                    <span className="text-xs font-black uppercase tracking-[0.16em]">
                      Biografia
                    </span>
                    <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" aria-hidden />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
