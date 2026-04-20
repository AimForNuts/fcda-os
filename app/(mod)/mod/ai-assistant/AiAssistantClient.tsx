'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

type Game = { id: string; date: string; location: string }
type PlayerEntry = {
  sheet_name: string
  current_rating: number | null
  preferred_positions: string[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function buildPrompt(players: PlayerEntry[]): string {
  const lines = players.map(p => {
    const pos =
      p.preferred_positions.length > 0
        ? p.preferred_positions.join(', ')
        : 'no position'
    const rating = p.current_rating != null ? p.current_rating.toFixed(2) : '1'
    return `- ${p.sheet_name} (${pos}) - Rating: ${rating}`
  })
  return `Give me next game teams\n\nPlayers:\n${lines.join('\n')}`
}

export function AiAssistantClient({ games }: { games: Game[] }) {
  const [selectedGameId, setSelectedGameId] = useState<string>(
    games[0]?.id ?? '',
  )
  const [players, setPlayers] = useState<PlayerEntry[]>([])
  const [loading, setLoading] = useState(Boolean(games[0]?.id))
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!selectedGameId) return
    let cancelled = false
    const supabase = createClient()
    ;(
      supabase
        .from('game_players')
        .select('players(sheet_name, current_rating, preferred_positions)')
        .eq('game_id', selectedGameId) as unknown as Promise<{
        data: Array<{ players: PlayerEntry | null }> | null
      }>
    ).then(({ data }) => {
      if (cancelled) return
      setPlayers(
        (data ?? [])
          .map(r => r.players)
          .filter((p): p is PlayerEntry => p != null),
      )
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [selectedGameId])

  const prompt = buildPrompt(players)

  async function handleCopy() {
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (games.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No scheduled games found.</p>
    )
  }

  return (
    <div className="space-y-6 max-w-xl">
      {/* Game selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="game-select">
          Game
        </label>
        <select
          id="game-select"
          className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
          value={selectedGameId}
          onChange={e => {
            setLoading(true)
            setSelectedGameId(e.target.value)
          }}
        >
          {games.map(g => (
            <option key={g.id} value={g.id}>
              {formatDate(g.date)} — {g.location}
            </option>
          ))}
        </select>
      </div>

      {/* Player list */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading players…</p>
      ) : players.length > 0 ? (
        <div className="space-y-1">
          <p className="text-sm font-medium">{players.length} players</p>
          {players.map((p, i) => (
            <p key={i} className="text-sm text-muted-foreground">
              {p.sheet_name} (
              {p.preferred_positions.length > 0
                ? p.preferred_positions.join(', ')
                : 'no position'}
              ) — {p.current_rating != null ? p.current_rating.toFixed(2) : '1'}
            </p>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No players in this game.
        </p>
      )}

      {/* Generated prompt */}
      {players.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Prompt</label>
          <textarea
            readOnly
            className="w-full rounded border border-input bg-muted px-3 py-2 text-sm font-mono min-h-[200px] resize-none"
            value={prompt}
          />
          <Button
            className="bg-fcda-navy text-white hover:bg-fcda-navy/90"
            onClick={handleCopy}
          >
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      )}
    </div>
  )
}
