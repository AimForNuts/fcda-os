'use client'

import { useState, useEffect } from 'react'
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function AiAssistantClient({ games }: { games: Game[] }) {
  const [selectedGameId, setSelectedGameId] = useState<string>(games[0]?.id ?? '')
  const [players, setPlayers] = useState<PlayerEntry[] | null>(games[0]?.id ? null : [])
  const [result, setResult] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedGameId) return
    let cancelled = false
    setResult(null)
    setError(null)
    fetch(`/api/games/${selectedGameId}/players`)
      .then(async (res) => {
        if (!res.ok) return []
        return res.json() as Promise<PlayerEntry[]>
      })
      .then((data) => { if (!cancelled) setPlayers(data) })
      .catch(() => { if (!cancelled) setPlayers([]) })
    return () => { cancelled = true }
  }, [selectedGameId])

  async function handleGenerate() {
    if (!players || players.length === 0) return
    setError(null)
    setResult(null)
    setIsGenerating(true)
    try {
      const res = await fetch('/api/mod/ai-assistant/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to generate teams.')
        return
      }
      setResult(data.result)
    } finally {
      setIsGenerating(false)
    }
  }

  if (games.length === 0) {
    return <p className="text-sm text-muted-foreground">No scheduled games found.</p>
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="game-select">Game</label>
        <select
          id="game-select"
          className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
          value={selectedGameId}
          onChange={(e) => {
            setSelectedGameId(e.target.value)
            setPlayers(null)
          }}
        >
          {games.map((g) => (
            <option key={g.id} value={g.id}>
              {formatDate(g.date)} — {g.location}
            </option>
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
                {p.current_rating != null ? p.current_rating.toFixed(2) : '—'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No players in this game.</p>
      )}

      {players && players.length > 0 && (
        <Button
          className="bg-fcda-navy text-white hover:bg-fcda-navy/90"
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating…' : 'Generate Teams'}
        </Button>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Teams</p>
          <pre className="w-full rounded border border-input bg-muted px-4 py-3 text-sm whitespace-pre-wrap font-mono leading-relaxed">
            {result}
          </pre>
        </div>
      )}
    </div>
  )
}
