'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { PlayerIdentity } from '@/components/player/PlayerIdentity'
import { CoachPlayerPanel } from './CoachPlayerPanel'

type PlayerRow = {
  id: string
  sheet_name: string
  shirt_number: number | null
  current_rating: number | null
  avatar_url: string | null
}

type SubmissionRow = {
  id: string
  gameDate: string
  gameLocation: string
  submitterName: string
  rating: number
  feedback: string | null
}

type Props = {
  players: PlayerRow[]
}

function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-PT')
}

export function CoachPlayerList({ players }: Props) {
  const { t } = useTranslation()
  const [openId, setOpenId] = useState<string | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [cache, setCache] = useState<Record<string, SubmissionRow[]>>({})
  const [loading, setLoading] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const deferredSearchValue = useDeferredValue(searchValue)

  const filteredPlayers = useMemo(() => {
    const query = normalizeSearch(deferredSearchValue.trim())
    if (!query) return players

    return players.filter((player) => {
      const values = [
        player.sheet_name,
        player.shirt_number?.toString() ?? '',
        player.current_rating?.toFixed(2) ?? '',
      ]

      return values.some((value) => normalizeSearch(value).includes(query))
    })
  }, [deferredSearchValue, players])

  if (players.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem jogadores.</p>
  }

  async function togglePlayer(id: string) {
    if (openId === id) {
      setOpenId(null)
      return
    }
    setOpenId(id)
    setFetchError(null)
    if (cache[id] !== undefined) return
    setLoading(id)
    const res = await fetch(`/api/admin/coach/players/${id}`)
    setLoading(null)
    if (res.ok) {
      const data = await res.json()
      setCache((prev) => ({ ...prev, [id]: data.submissions }))
    } else {
      setFetchError('Erro ao carregar avaliações.')
    }
  }

  return (
    <div className="space-y-3">
      <div className="max-w-md">
        <label htmlFor="admin-coach-player-search" className="sr-only">
          {t('admin.searchCoachPlayers')}
        </label>
        <Input
          id="admin-coach-player-search"
          type="search"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder={t('admin.searchCoachPlayers')}
        />
      </div>

      <div className="divide-y border rounded-lg">
        {filteredPlayers.map((player) => {
          const isOpen = openId === player.id
          const isLoading = loading === player.id
          return (
            <div key={player.id}>
              <button
                onClick={() => togglePlayer(player.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <PlayerIdentity
                    name={player.sheet_name}
                    shirtNumber={player.shirt_number}
                    avatarUrl={player.avatar_url}
                    avatarSize="sm"
                    nameClassName="font-medium"
                  />
                </div>
                <div className="flex items-center gap-3">
                  {player.current_rating != null && (
                    <span className="text-sm text-muted-foreground">
                      {player.current_rating.toFixed(2)}
                    </span>
                  )}
                  <span className="text-muted-foreground text-xs">{isOpen ? '▲' : '▼'}</span>
                </div>
              </button>
              {isOpen && (
                <div className="px-4 pb-4">
                  {isLoading && (
                    <p className="text-sm text-muted-foreground py-2">A carregar...</p>
                  )}
                  {fetchError && !isLoading && (
                    <p className="text-sm text-destructive py-2">{fetchError}</p>
                  )}
                  {cache[player.id] !== undefined && (
                    <CoachPlayerPanel submissions={cache[player.id]} />
                  )}
                </div>
              )}
            </div>
          )
        })}

        {filteredPlayers.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {t('admin.noPlayersFound')}
          </p>
        )}
      </div>
    </div>
  )
}
