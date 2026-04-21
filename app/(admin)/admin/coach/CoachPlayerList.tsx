'use client'

import { useState } from 'react'
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

export function CoachPlayerList({ players }: Props) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [cache, setCache] = useState<Record<string, SubmissionRow[]>>({})
  const [loading, setLoading] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

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
    <div className="divide-y border rounded-lg">
      {players.map((player) => {
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
    </div>
  )
}
