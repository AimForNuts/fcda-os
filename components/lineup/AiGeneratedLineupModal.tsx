'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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

export type AiLineupPromptPreview = {
  game_id: string
  player_count: number
  prompt: {
    system: string
    user: string
  }
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
  promptPreview: AiLineupPromptPreview | null
  promptDraft: AiLineupPromptPreview['prompt'] | null
  playerCount: number
  isPreparingPrompt: boolean
  isGenerating: boolean
  isApplying: boolean
  error: string | null
  onPromptDraftChange: (prompt: AiLineupPromptPreview['prompt']) => void
  onGenerate: () => void
  onApply: () => void
  onRegenerate: () => void
  onClose: () => void
}

export function AiGeneratedLineupModal({
  teams,
  promptPreview,
  promptDraft,
  playerCount,
  isPreparingPrompt,
  isGenerating,
  isApplying,
  error,
  onPromptDraftChange,
  onGenerate,
  onApply,
  onRegenerate,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'lineup' | 'reasoning'>('lineup')
  const generatedTitle = t('mod.lineup.aiModal.generatedTitle')
  const promptTitle = t('mod.lineup.aiModal.promptTitle')
  const title = teams
    ? generatedTitle === 'mod.lineup.aiModal.generatedTitle' ? 'Generated Lineup' : generatedTitle
    : promptTitle === 'mod.lineup.aiModal.promptTitle' ? 'AI Team Prompt' : promptTitle

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
                ? t('mod.lineup.aiModal.balanceSummary', {
                    ratingDelta: teams.balance.rating_delta.toFixed(1),
                    playerCountDelta: teams.balance.player_count_delta,
                  })
                : promptPreview
                  ? t('mod.lineup.aiModal.reviewingPrompt', { count: promptPreview.player_count })
                  : t('mod.lineup.aiModal.preparingPrompt', { count: playerCount })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={t('common.close')}
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
                {t('mod.lineup.aiModal.teamsTab') === 'mod.lineup.aiModal.teamsTab'
                  ? 'Teams'
                  : t('mod.lineup.aiModal.teamsTab')}
              </button>
              <button
                type="button"
                onClick={() => setTab('reasoning')}
                className={tab === 'reasoning'
                  ? 'border-b-2 border-fcda-navy pb-3 font-semibold text-fcda-navy'
                  : 'border-b-2 border-transparent pb-3 text-muted-foreground hover:text-foreground'}
              >
                {t('mod.lineup.aiModal.reasoningTab') === 'mod.lineup.aiModal.reasoningTab'
                  ? 'Reasoning'
                  : t('mod.lineup.aiModal.reasoningTab')}
              </button>
            </div>
          </div>
        )}

        <div className="max-h-[58vh] overflow-y-auto px-4 py-4 sm:px-5">
          {isPreparingPrompt ? (
            <PreparingPromptState playerCount={playerCount} />
          ) : isGenerating ? (
            <GeneratingState playerCount={playerCount} />
          ) : error ? (
            <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
              <p className="text-sm font-medium text-destructive">{t('mod.lineup.aiGenerateError')}</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
          ) : teams && tab === 'lineup' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <TeamPreviewPanel team="a" preview={teams.team_a} />
              <TeamPreviewPanel team="b" preview={teams.team_b} />
            </div>
          ) : teams ? (
            <ReasoningPanel reasoning={teams.reasoning} notes={teams.notes} />
          ) : promptDraft ? (
            <PromptPreviewPanel
              prompt={promptDraft}
              onChange={onPromptDraftChange}
            />
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-border px-4 py-4 sm:px-5">
          {(teams || error) && (
            <Button variant="outline" onClick={onRegenerate} disabled={isPreparingPrompt || isGenerating || isApplying}>
              {teams ? t('mod.lineup.aiModal.regenerate') : t('common.retry')}
            </Button>
          )}
          {promptPreview && !teams && !error && (
            <Button
              className="bg-fcda-gold text-fcda-navy font-semibold hover:bg-fcda-gold/90"
              onClick={onGenerate}
              disabled={isGenerating || isPreparingPrompt || !promptDraft?.system.trim() || !promptDraft.user.trim()}
            >
              {isGenerating
                ? t('mod.lineup.aiGenerating')
                : t('mod.lineup.aiModal.generateTeams') === 'mod.lineup.aiModal.generateTeams'
                  ? 'Generate Teams'
                  : t('mod.lineup.aiModal.generateTeams')}
            </Button>
          )}
          {teams && (
            <Button
              className="bg-fcda-gold text-fcda-navy font-semibold hover:bg-fcda-gold/90"
              onClick={onApply}
              disabled={isApplying || isGenerating}
            >
              {isApplying
                ? t('mod.lineup.aiModal.applying')
                : t('mod.lineup.aiModal.applyToLineup') === 'mod.lineup.aiModal.applyToLineup'
                  ? 'Apply to Lineup'
                  : t('mod.lineup.aiModal.applyToLineup')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function GeneratingState({ playerCount }: { playerCount: number }) {
  const { t } = useTranslation()
  const labels = [
    t('mod.lineup.aiModal.anchors'),
    t('mod.lineup.aiModal.teamShape'),
    t('mod.lineup.aiModal.captains'),
  ]

  const balancingLabel = t('mod.lineup.aiModal.balancing', { count: playerCount })

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-fcda-navy">
            {balancingLabel === 'mod.lineup.aiModal.balancing'
              ? `Balancing ${playerCount} ${playerCount === 1 ? 'player' : 'players'}`
              : balancingLabel}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('mod.lineup.aiModal.generatingHint')}
          </p>
        </div>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-fcda-gold border-t-fcda-navy" />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {labels.map((label) => (
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

function PreparingPromptState({ playerCount }: { playerCount: number }) {
  const { t } = useTranslation()
  const promptLabel = t('mod.lineup.aiModal.creatingPrompt', { count: playerCount })

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-fcda-navy">
            {promptLabel === 'mod.lineup.aiModal.creatingPrompt'
              ? `Creating prompt for ${playerCount} ${playerCount === 1 ? 'player' : 'players'}`
              : promptLabel}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('mod.lineup.aiModal.preparingHint')}
          </p>
        </div>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-fcda-gold border-t-fcda-navy" />
      </div>
    </div>
  )
}

function PromptPreviewPanel({
  prompt,
  onChange,
}: {
  prompt: AiLineupPromptPreview['prompt']
  onChange: (prompt: AiLineupPromptPreview['prompt']) => void
}) {
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      <PromptBlock
        title={
          t('mod.lineup.aiModal.systemPrompt') === 'mod.lineup.aiModal.systemPrompt'
            ? 'System prompt'
            : t('mod.lineup.aiModal.systemPrompt')
        }
        value={prompt.system}
        onChange={(system) => onChange({ ...prompt, system })}
      />
      <PromptBlock
        title={
          t('mod.lineup.aiModal.userPrompt') === 'mod.lineup.aiModal.userPrompt'
            ? 'User prompt'
            : t('mod.lineup.aiModal.userPrompt')
        }
        value={prompt.user}
        onChange={(user) => onChange({ ...prompt, user })}
      />
    </div>
  )
}

function PromptBlock({
  title,
  value,
  onChange,
}: {
  title: string
  value: string
  onChange: (value: string) => void
}) {
  const id = title.toLowerCase().replace(/\s+/g, '-')
  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-3 py-2">
        <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </label>
      </div>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-56 w-full resize-y border-0 bg-transparent px-3 py-3 font-mono text-xs leading-5 text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        spellCheck={false}
      />
    </section>
  )
}

function TeamPreviewPanel({ team, preview }: { team: 'a' | 'b'; preview: TeamPreview }) {
  const { t } = useTranslation()

  return (
    <div className="space-y-3">
      <TeamHeader team={team} />
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('mod.lineup.aiModal.playerCount', { count: preview.players.length })}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('mod.lineup.aiModal.ratingSummary', {
              total: preview.rating_total.toFixed(1),
              average: preview.average_rating.toFixed(1),
            })}
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
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('mod.lineup.aiModal.reasoningTab')}</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {(reasoning.length > 0 ? reasoning : [t('mod.lineup.aiModal.noReasoning')]).map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-fcda-gold" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      {notes.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('mod.lineup.aiModal.notes')}</h3>
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
