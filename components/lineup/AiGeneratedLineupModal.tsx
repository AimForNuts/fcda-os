'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PlayerIdentity } from '@/components/player/PlayerIdentity'
import { TeamHeader } from '@/components/matches/TeamHeader'

export type AiGeneratedLineup = {
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

export type TeamPreview = {
  label: string
  players: PlayerPreview[]
  rating_total: number
  average_rating: number
}

export type PlayerPreview = {
  player_id: string
  sheet_name: string
  shirt_number: number | null
  nationality: string
  current_rating: number | null
  preferred_positions: string[]
  avatar_url: string | null
  is_captain: boolean
}

type Props = {
  teams: AiGeneratedLineup | null
  playerCount: number
  isGenerating: boolean
  isApplying: boolean
  error: string | null
  onApply: () => void
  onRegenerate: () => void
  onClose: () => void
}

export function AiGeneratedLineupModal({
  teams,
  playerCount,
  isGenerating,
  isApplying,
  error,
  onApply,
  onRegenerate,
  onClose,
}: Props) {
  const [tab, setTab] = useState<'lineup' | 'reasoning'>('lineup')
  const title = teams ? 'Generated Lineup' : 'Generate Teams with AI'

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
              {title}
            </h2>
            <p className="text-xs text-muted-foreground">
              {teams
                ? `Rating delta ${teams.balance.rating_delta.toFixed(1)} · Player count delta ${teams.balance.player_count_delta}`
                : `Balancing ${playerCount} players from this game`}
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

        {teams && !isGenerating && (
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
        )}

        <div className="max-h-[58vh] overflow-y-auto px-4 py-4 sm:px-5">
          {isGenerating ? (
            <GeneratingState playerCount={playerCount} />
          ) : error ? (
            <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
              <p className="text-sm font-medium text-destructive">Failed to generate teams.</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
          ) : teams && tab === 'lineup' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <TeamPreviewPanel team="a" preview={teams.team_a} />
              <TeamPreviewPanel team="b" preview={teams.team_b} />
            </div>
          ) : teams ? (
            <ReasoningPanel reasoning={teams.reasoning} notes={teams.notes} />
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-border px-4 py-4 sm:px-5">
          <Button variant="outline" onClick={onRegenerate} disabled={isGenerating || isApplying}>
            {teams || error ? 'Regenerate' : 'Retry'}
          </Button>
          {teams && (
            <Button
              className="bg-fcda-gold text-fcda-navy font-semibold hover:bg-fcda-gold/90"
              onClick={onApply}
              disabled={isApplying || isGenerating}
            >
              {isApplying ? 'Applying…' : 'Apply to Lineup'}
            </Button>
          )}
        </div>
      </div>
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
                nationality={player.nationality}
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
