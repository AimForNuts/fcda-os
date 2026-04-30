'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PlayerIdentity } from '@/components/player/PlayerIdentity'

type Game = { id: string; date: string; location: string }
type PlayerEntry = {
  id: string
  sheet_name: string
  current_rating: number | null
  preferred_positions: string[]
  avatar_url: string | null
  last3Ratings: number[]
  totalGames: number
  winPct: number | null
  recentFeedback: string[]
}
type TeamsResult = {
  team_a: string[]
  team_b: string[]
  notes?: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function totalRating(playerIds: string[], players: PlayerEntry[]) {
  return playerIds.reduce((sum, id) => {
    const p = players.find((p) => p.id === id)
    return sum + (p?.current_rating ?? 0)
  }, 0)
}

export function AiAssistantClient({ games }: { games: Game[] }) {
  const router = useRouter()
  const [selectedGameId, setSelectedGameId] = useState<string>(games[0]?.id ?? '')
  const [players, setPlayers] = useState<PlayerEntry[] | null>(games[0]?.id ? null : [])
  const [teams, setTeams] = useState<TeamsResult | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedGameId) return
    let cancelled = false
    setTeams(null)
    setError(null)
    fetch(`/api/games/${selectedGameId}/players`)
      .then(async (res) => (res.ok ? (res.json() as Promise<PlayerEntry[]>) : []))
      .then((data) => { if (!cancelled) setPlayers(data) })
      .catch(() => { if (!cancelled) setPlayers([]) })
    return () => { cancelled = true }
  }, [selectedGameId])

  async function handleGenerate() {
    if (!players || players.length === 0) return
    setError(null)
    setTeams(null)
    setIsGenerating(true)
    try {
      const res = await fetch('/api/mod/ai-assistant/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to generate teams.'); return }
      setTeams(data)
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleApply() {
    if (!teams || !selectedGameId) return
    setError(null)
    setIsApplying(true)
    try {
      const lineup = [
        ...teams.team_a.map((id) => ({ player_id: id, team: 'a' as const })),
        ...teams.team_b.map((id) => ({ player_id: id, team: 'b' as const })),
      ]
      const res = await fetch(`/api/games/${selectedGameId}/lineup`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: lineup }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to apply lineup.')
        return
      }
      router.push(`/mod/games/${selectedGameId}/lineup`)
    } finally {
      setIsApplying(false)
    }
  }

  if (games.length === 0) {
    return <p className="text-sm text-muted-foreground">No scheduled games found.</p>
  }

  const playerMap = new Map((players ?? []).map((p) => [p.id, p]))

  return (
    <div className="space-y-6 max-w-xl">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="game-select">Game</label>
        <select
          id="game-select"
          className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
          value={selectedGameId}
          onChange={(e) => { setSelectedGameId(e.target.value); setPlayers(null); setTeams(null) }}
        >
          {games.map((g) => (
            <option key={g.id} value={g.id}>{formatDate(g.date)} — {g.location}</option>
          ))}
        </select>
      </div>

      {players == null ? (
        <p className="text-sm text-muted-foreground">Loading players…</p>
      ) : players.length > 0 ? (
        <div className="space-y-1">
          <p className="text-sm font-medium">{players.length} players</p>
          {players.map((p, i) => (
            <div key={p.id ?? i} className="flex items-center justify-between gap-3 text-sm">
              <PlayerIdentity name={p.sheet_name} avatarUrl={p.avatar_url} avatarSize="sm" />
              <span className="text-muted-foreground">
                {p.preferred_positions.length > 0 ? p.preferred_positions.join(', ') : 'no position'}
                {' — '}
                {p.current_rating != null && p.current_rating > 0 ? p.current_rating.toFixed(1) : '—'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No players in this game.</p>
      )}

      {players && players.length > 0 && !teams && (
        <Button
          className="bg-fcda-navy text-white hover:bg-fcda-navy/90"
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating…' : 'Generate Teams'}
        </Button>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {teams && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {(['a', 'b'] as const).map((team) => {
              const ids = team === 'a' ? teams.team_a : teams.team_b
              const label = team === 'a' ? 'Equipa Branca' : 'Equipa Preta'
              const total = totalRating(ids, players ?? [])
              return (
                <div key={team} className="rounded border border-border p-3 space-y-2">
                  <p className="text-sm font-semibold">{label}</p>
                  <ul className="space-y-1">
                    {ids.map((id) => {
                      const p = playerMap.get(id)
                      return (
                        <li key={id} className="text-sm flex items-center justify-between">
                          <span>{p?.sheet_name ?? id}</span>
                          <span className="text-muted-foreground text-xs">
                            {p?.current_rating && p.current_rating > 0 ? p.current_rating.toFixed(1) : '—'}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                  <p className="text-xs text-muted-foreground border-t border-border pt-1">
                    Total: {total.toFixed(1)}
                  </p>
                </div>
              )
            })}
          </div>

          {teams.notes && (
            <p className="text-xs text-muted-foreground italic">{teams.notes}</p>
          )}

          <div className="flex gap-3">
            <Button
              className="bg-fcda-gold text-fcda-navy font-semibold hover:bg-fcda-gold/90"
              onClick={handleApply}
              disabled={isApplying}
            >
              {isApplying ? 'Applying…' : 'Apply to Lineup'}
            </Button>
            <Button
              variant="outline"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating…' : 'Regenerate'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
