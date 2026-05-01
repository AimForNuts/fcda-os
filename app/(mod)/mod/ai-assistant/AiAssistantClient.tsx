'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PlayerIdentity } from '@/components/player/PlayerIdentity'
import { TeamHeader } from '@/components/matches/TeamHeader'

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
  game_id: string
  team_a: TeamPreview
  team_b: TeamPreview
  balance: {
    rating_delta: number
    player_count_delta: number
  }
  notes: string[]
  reasoning: string[]
}
type TeamPreview = {
  label: string
  players: PlayerPreview[]
  rating_total: number
  average_rating: number
}
type PlayerPreview = {
  player_id: string
  sheet_name: string
  shirt_number: number | null
  current_rating: number | null
  preferred_positions: string[]
  avatar_url: string | null
  is_captain: boolean
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function AiAssistantClient({ games }: { games: Game[] }) {
  const router = useRouter()
  const [selectedGameId, setSelectedGameId] = useState<string>(games[0]?.id ?? '')
  const [players, setPlayers] = useState<PlayerEntry[] | null>(games[0]?.id ? null : [])
  const [teams, setTeams] = useState<TeamsResult | null>(null)
  const [isResultOpen, setIsResultOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedGameId) return
    let cancelled = false
    setTeams(null)
    setIsResultOpen(false)
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
    setIsResultOpen(false)
    setIsGenerating(true)
    try {
      const res = await fetch('/api/mod/ai-assistant/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: selectedGameId }),
      })
      const data = await res.json()
      if (!res.ok) {
        const details = Array.isArray(data.details) ? ` ${data.details.join(' ')}` : ''
        setError(`${data.error ?? 'Failed to generate teams.'}${details}`)
        return
      }
      setTeams(data)
      setIsResultOpen(true)
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
        ...teams.team_a.players.map((p) => ({
          player_id: p.player_id,
          team: 'a' as const,
          is_captain: p.is_captain,
        })),
        ...teams.team_b.players.map((p) => ({
          player_id: p.player_id,
          team: 'b' as const,
          is_captain: p.is_captain,
        })),
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

  return (
    <div className="space-y-6 max-w-xl">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="game-select">Game</label>
        <select
          id="game-select"
          className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
          value={selectedGameId}
          onChange={(e) => { setSelectedGameId(e.target.value); setPlayers(null); setTeams(null); setIsResultOpen(false) }}
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

      {players && players.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <Button
              className="bg-fcda-navy text-white hover:bg-fcda-navy/90"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating teams…' : teams ? 'Regenerate Teams' : 'Generate Teams'}
            </Button>
            {teams && (
              <Button
                variant="outline"
                onClick={() => setIsResultOpen(true)}
                disabled={isGenerating}
              >
                View Generated Teams
              </Button>
            )}
          </div>
          {isGenerating && <GeneratingState playerCount={players.length} />}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {teams && isResultOpen && (
        <GeneratedTeamsModal
          teams={teams}
          isApplying={isApplying}
          isGenerating={isGenerating}
          onApply={handleApply}
          onRegenerate={handleGenerate}
          onClose={() => setIsResultOpen(false)}
        />
      )}
    </div>
  )
}

function GeneratingState({ playerCount }: { playerCount: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-fcda-navy">Balancing {playerCount} players</p>
          <p className="text-xs text-muted-foreground">
            Ratings, positions, feedback and captain choices are being checked.
          </p>
        </div>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-fcda-gold border-t-fcda-navy" />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {['Anchors', 'Team shape', 'Captains'].map((label) => (
          <div key={label} className="rounded border border-border/70 bg-background px-3 py-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-fcda-gold" />
            </div>
            <p className="mt-2 text-xs font-medium text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function GeneratedTeamsModal({
  teams,
  isApplying,
  isGenerating,
  onApply,
  onRegenerate,
  onClose,
}: {
  teams: TeamsResult
  isApplying: boolean
  isGenerating: boolean
  onApply: () => void
  onRegenerate: () => void
  onClose: () => void
}) {
  const [tab, setTab] = useState<'lineup' | 'reasoning'>('lineup')

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-lineup-title"
        className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-t-xl border border-border bg-background shadow-xl sm:rounded-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-5">
          <div className="min-w-0 space-y-1">
            <h2 id="ai-lineup-title" className="text-lg font-bold text-fcda-navy">
              Generated Lineup
            </h2>
            <p className="text-xs text-muted-foreground">
              Rating delta {teams.balance.rating_delta.toFixed(1)} · Player count delta {teams.balance.player_count_delta}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-border px-4 pt-3 sm:px-5">
          <div className="flex gap-4 text-sm">
            <button
              type="button"
              onClick={() => setTab('lineup')}
              className={tab === 'lineup'
                ? 'border-b-2 border-fcda-navy pb-3 font-semibold text-fcda-navy'
                : 'border-b-2 border-transparent pb-3 text-muted-foreground hover:text-foreground'}
            >
              Teams
            </button>
            <button
              type="button"
              onClick={() => setTab('reasoning')}
              className={tab === 'reasoning'
                ? 'border-b-2 border-fcda-navy pb-3 font-semibold text-fcda-navy'
                : 'border-b-2 border-transparent pb-3 text-muted-foreground hover:text-foreground'}
            >
              Reasoning
            </button>
          </div>
        </div>

        <div className="max-h-[58vh] overflow-y-auto px-4 py-4 sm:px-5">
          {tab === 'lineup' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <TeamPreviewPanel team="a" preview={teams.team_a} />
              <TeamPreviewPanel team="b" preview={teams.team_b} />
            </div>
          ) : (
            <ReasoningPanel reasoning={teams.reasoning} notes={teams.notes} />
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-border px-4 py-4 sm:px-5">
          <Button variant="outline" onClick={onRegenerate} disabled={isGenerating || isApplying}>
            {isGenerating ? 'Generating…' : 'Regenerate'}
          </Button>
          <Button
            className="bg-fcda-gold text-fcda-navy font-semibold hover:bg-fcda-gold/90"
            onClick={onApply}
            disabled={isApplying || isGenerating}
          >
            {isApplying ? 'Applying…' : 'Apply to Lineup'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function TeamPreviewPanel({ team, preview }: { team: 'a' | 'b'; preview: TeamPreview }) {
  return (
    <div className="space-y-3">
      <TeamHeader team={team} />
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {preview.players.length} players
          </p>
          <p className="text-xs text-muted-foreground">
            Total {preview.rating_total.toFixed(1)} · Avg {preview.average_rating.toFixed(1)}
          </p>
        </div>
        <div className="divide-y divide-border/70">
          {preview.players.map((player) => (
            <div key={player.player_id} className="flex items-center justify-between gap-3 px-3 py-2">
              <PlayerIdentity
                name={player.sheet_name}
                shirtNumber={player.shirt_number}
                avatarUrl={player.avatar_url}
                avatarSize="sm"
                className="min-w-0 text-sm"
              />
              <div className="flex shrink-0 items-center gap-2">
                {player.is_captain && (
                  <span className="rounded bg-fcda-gold/40 px-1.5 py-0.5 text-[10px] font-bold uppercase text-fcda-navy">
                    C
                  </span>
                )}
                <span className="text-xs tabular-nums text-muted-foreground">
                  {player.current_rating && player.current_rating > 0 ? player.current_rating.toFixed(1) : '—'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ReasoningPanel({ reasoning, notes }: { reasoning: string[]; notes: string[] }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reasoning</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {(reasoning.length > 0 ? reasoning : ['No reasoning returned.']).map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-fcda-gold" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      {notes.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</h3>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {notes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
