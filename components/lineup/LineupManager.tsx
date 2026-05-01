'use client'

import { useState, useCallback, useRef, type DragEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { WhatsAppPasteBox } from './WhatsAppPasteBox'
import { PlayerChip } from './PlayerChip'
import { TeamAssignmentToggle } from './TeamAssignmentToggle'
import { Button } from '@/components/ui/button'
import { TeamHeader } from '@/components/matches/TeamHeader'
import type { ParsedEntry } from '@/lib/whatsapp/parser'

type ResolvedEntry = {
  raw: string
  normalised: string
  status: 'matched' | 'ambiguous' | 'unmatched'
  matches: Array<{
    id: string
    sheet_name: string
    shirt_number: number | null
    avatar_url: string | null
  }>
  resolvedPlayerId: string | null
  resolvedName: string | null
  resolvedShirtNumber: number | null
  resolvedAvatarUrl: string | null
  team: 'a' | 'b' | null
  is_captain: boolean
  originallyUnmatched: boolean
}

type CurrentPlayer = {
  player_id: string
  sheet_name: string
  shirt_number: number | null
  avatar_url: string | null
  team: 'a' | 'b' | null
  is_captain: boolean
}

type Props = {
  gameId: string
  currentLineup: CurrentPlayer[]
}

type SearchResult = {
  id: string
  sheet_name: string
  shirt_number: number | null
  avatar_url: string | null
}

export function LineupManager({ gameId, currentLineup }: Props) {
  const { t } = useTranslation()
  const router = useRouter()

  const [phase, setPhase] = useState<'paste' | 'resolve'>('paste')
  const [entries, setEntries] = useState<ResolvedEntry[]>([])
  const [isParsing, setIsParsing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<Record<number, SearchResult[]>>({})
  const [searchQueries, setSearchQueries] = useState<Record<number, string>>({})
  const [addingGuest, setAddingGuest] = useState<Set<number>>(new Set())
  const [saveAliasMap, setSaveAliasMap] = useState<Record<number, boolean>>({})
  const searchAbortRefs = useRef<Record<number, AbortController>>({})

  // Editable copy of the current lineup for team assignment in the paste phase
  const [editableLineup, setEditableLineup] = useState(currentLineup)
  const [isSavingTeams, setIsSavingTeams] = useState(false)
  const [teamsError, setTeamsError] = useState<string | null>(null)
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null)

  // ── Current lineup team editing ────────────────────────────────────────
  function setCurrentTeam(playerId: string, team: 'a' | 'b' | null) {
    setEditableLineup((prev) => {
      const moving = prev.find((p) => p.player_id === playerId)
      const remainsCaptain = Boolean(team && moving?.is_captain)
      return prev.map((p) => {
        if (p.player_id === playerId) {
          return { ...p, team, is_captain: remainsCaptain }
        }
        if (remainsCaptain && p.team === team) {
          return { ...p, is_captain: false }
        }
        return p
      })
    })
  }

  function setCurrentCaptain(playerId: string) {
    setEditableLineup((prev) => {
      const selected = prev.find((p) => p.player_id === playerId)
      if (!selected?.team) return prev
      return prev.map((p) =>
        p.team === selected.team
          ? { ...p, is_captain: p.player_id === playerId }
          : p
      )
    })
  }

  function validateCurrentCaptainCounts() {
    const counts = { a: 0, b: 0 }
    for (const player of editableLineup) {
      if (player.is_captain && player.team) counts[player.team] += 1
    }
    return counts.a <= 1 && counts.b <= 1
  }

  function handleDrop(team: 'a' | 'b' | null, event: DragEvent<HTMLElement>) {
    event.preventDefault()
    const playerId = event.dataTransfer.getData('text/plain') || draggedPlayerId
    if (!playerId) return
    setCurrentTeam(playerId, team)
    setDraggedPlayerId(null)
  }

  async function saveTeams() {
    if (!validateCurrentCaptainCounts()) {
      setTeamsError(t('mod.lineup.errorCaptainCount'))
      return
    }
    setIsSavingTeams(true)
    setTeamsError(null)
    const players = editableLineup.map((p) => ({
      player_id: p.player_id,
      team: p.team,
      is_captain: p.is_captain,
    }))
    const res = await fetch(`/api/games/${gameId}/lineup`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ players }),
    })
    if (!res.ok) {
      setTeamsError(t('mod.lineup.errorSave'))
    } else {
      router.refresh()
    }
    setIsSavingTeams(false)
  }

  // ── Parse ──────────────────────────────────────────────────────────────
  const handleParse = useCallback(async (text: string) => {
    setIsParsing(true)
    setParseError(null)
    try {
      const res = await fetch('/api/lineup/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error()
      const parsed: ParsedEntry[] = await res.json()
      const resolved: ResolvedEntry[] = parsed.map((e) => ({
        ...e,
        resolvedPlayerId: e.status === 'matched' ? e.matches[0].id : null,
        resolvedName: e.status === 'matched' ? e.matches[0].sheet_name : null,
        resolvedShirtNumber: e.status === 'matched' ? e.matches[0].shirt_number : null,
        resolvedAvatarUrl: e.status === 'matched' ? e.matches[0].avatar_url : null,
        team: null,
        is_captain: false,
        originallyUnmatched: e.status === 'unmatched',
      }))
      setEntries(resolved)
      setPhase('resolve')
    } catch {
      setParseError(t('mod.lineup.errorParse'))
    } finally {
      setIsParsing(false)
    }
  }, [t])

  // ── Resolve helpers ────────────────────────────────────────────────────
  function resolveEntry(index: number, player: SearchResult, skipAlias = false) {
    const entry = entries[index]
    if (entry?.originallyUnmatched && !skipAlias) {
      setSaveAliasMap((m) => ({ ...m, [index]: true }))
    }
    setEntries((prev) =>
      prev.map((e, i) =>
        i === index
          ? {
              ...e,
              resolvedPlayerId: player.id,
              resolvedName: player.sheet_name,
              resolvedShirtNumber: player.shirt_number,
              resolvedAvatarUrl: player.avatar_url,
              status: 'matched',
            }
          : e
      )
    )
  }

  function setTeam(index: number, team: 'a' | 'b' | null) {
    setEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, team } : e))
    )
  }

  // ── Player search (for unmatched entries) ──────────────────────────────
  async function searchPlayers(index: number, q: string) {
    setSearchQueries((prev) => ({ ...prev, [index]: q }))
    if (!q.trim()) {
      setSearchResults((prev) => ({ ...prev, [index]: [] }))
      return
    }
    // Cancel in-flight request for this index
    searchAbortRefs.current[index]?.abort()
    const controller = new AbortController()
    searchAbortRefs.current[index] = controller
    try {
      const res = await fetch(`/api/players?q=${encodeURIComponent(q)}`, { signal: controller.signal })
      if (res.ok) {
        const data: SearchResult[] = await res.json()
        setSearchResults((prev) => ({ ...prev, [index]: data }))
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setSearchResults((prev) => ({ ...prev, [index]: [] }))
    }
  }

  // ── Add guest ──────────────────────────────────────────────────────────
  async function addGuest(index: number) {
    if (addingGuest.has(index)) return
    setAddingGuest((prev) => new Set(prev).add(index))
    try {
      const entry = entries[index]
      // If the mod typed a custom name in the search box, use it as the player name.
      // Keep the original WhatsApp name as the alias so future parses auto-match.
      const typedName = searchQueries[index]?.trim()
      const sheet_name = typedName || entry.raw
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheet_name, alias_display: entry.raw }),
      })
      if (res.ok) {
        const { id, sheet_name } = await res.json()
        resolveEntry(index, {
          id,
          sheet_name,
          shirt_number: null,
          avatar_url: null,
        }, true)
      } else {
        setSaveError(t('mod.lineup.errorSave'))
      }
    } catch {
      setSaveError(t('mod.lineup.errorSave'))
    } finally {
      setAddingGuest((prev) => { const s = new Set(prev); s.delete(index); return s })
    }
  }

  // ── Save ───────────────────────────────────────────────────────────────
  async function handleSave() {
    setIsSaving(true)
    setSaveError(null)

    // Save aliases for resolved-from-unmatched entries where checkbox is checked
    await Promise.all(
      entries
        .filter((e, i) => e.originallyUnmatched && e.resolvedPlayerId != null && saveAliasMap[i])
        .map((e) =>
          fetch('/api/lineup/aliases', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player_id: e.resolvedPlayerId, alias_display: e.raw }),
          }).catch(() => {})
        )
    )

    const players = entries
      .filter((e) => e.resolvedPlayerId != null)
      .map((e) => ({
        player_id: e.resolvedPlayerId!,
        team: e.team ?? null,
        is_captain: e.team ? e.is_captain : false,
      }))

    const res = await fetch(`/api/games/${gameId}/lineup`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ players }),
    })

    if (!res.ok) {
      setSaveError(t('mod.lineup.errorSave'))
      setIsSaving(false)
      return
    }

    router.push(`/matches/${gameId}`)
    router.refresh()
  }

  const resolvedCount = entries.filter((e) => e.resolvedPlayerId != null).length
  const hasUnresolved = entries.some((e) => e.resolvedPlayerId == null)

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Current lineup (if set) — editable team assignments */}
      {editableLineup.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t('mod.lineup.current')}
          </h2>
          <div className="grid gap-2 md:grid-cols-2">
            {(['a', 'b'] as const).map((team) => (
              <CurrentTeamDropZone
                key={team}
                team={team}
                players={editableLineup.filter((p) => p.team === team)}
                setDraggedPlayerId={setDraggedPlayerId}
                onDrop={handleDrop}
                onCaptain={setCurrentCaptain}
                captainLabel={t('mod.lineup.captain')}
                makeCaptainLabel={t('mod.lineup.makeCaptain')}
                captainColumnLabel={t('mod.lineup.captainShort')}
              />
            ))}
          </div>
          <CurrentTeamDropZone
            team={null}
            players={editableLineup.filter((p) => p.team == null)}
            setDraggedPlayerId={setDraggedPlayerId}
            onDrop={handleDrop}
            onCaptain={setCurrentCaptain}
            captainLabel={t('mod.lineup.captain')}
            makeCaptainLabel={t('mod.lineup.makeCaptain')}
            captainColumnLabel={t('mod.lineup.captainShort')}
            emptyLabel={t('mod.lineup.noUnassigned')}
            title={t('mod.lineup.noTeamLabel')}
          />
          {teamsError && <p role="alert" className="text-sm text-destructive">{teamsError}</p>}
          <Button
            type="button"
            size="sm"
            onClick={saveTeams}
            disabled={isSavingTeams}
            className="bg-fcda-navy text-white hover:bg-fcda-navy/90"
          >
            {isSavingTeams ? t('common.loading') : t('mod.lineup.saveLineup')}
          </Button>
        </div>
      )}

      {/* Paste phase */}
      {phase === 'paste' && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            {t('mod.lineup.whatsappPaste')}
          </h2>
          {parseError && <p className="text-sm text-destructive mb-2">{parseError}</p>}
          <WhatsAppPasteBox onParse={handleParse} isParsing={isParsing} />
        </div>
      )}

      {/* Resolve phase */}
      {phase === 'resolve' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {resolvedCount}/{entries.length} resolvidos
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setPhase('paste'); setEntries([]) }}
            >
              ← Re-parse
            </Button>
          </div>

          <div className="space-y-3">
            {entries.map((entry, i) => (
              <div key={entry.raw} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <PlayerChip
                    name={entry.resolvedName ?? entry.raw}
                    shirtNumber={entry.resolvedShirtNumber}
                    avatarUrl={entry.resolvedAvatarUrl}
                    status={entry.resolvedPlayerId ? 'matched' : entry.status}
                  />
                  {/* Team toggle */}
                  {entry.resolvedPlayerId && (
                    <TeamAssignmentToggle
                      value={entry.team}
                      onChange={(team) => setTeam(i, team)}
                      noTeamLabel={t('mod.lineup.noTeamLabel')}
                      className="ml-auto"
                    />
                  )}
                </div>

                {/* Ambiguous: pick from dropdown */}
                {!entry.resolvedPlayerId && entry.status === 'ambiguous' && (
                  <select
                    className="w-full rounded border border-input bg-background px-2 py-1 text-sm"
                    value={entry.resolvedPlayerId ?? ''}
                    onChange={(e) => {
                      const match = entry.matches.find((m) => m.id === e.target.value)
                      if (match) resolveEntry(i, match)
                    }}
                  >
                    <option value="" disabled>{t('mod.lineup.pickPlayer')}</option>
                    {entry.matches.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.shirt_number != null ? `#${m.shirt_number} ` : ''}
                        {m.sheet_name}
                      </option>
                    ))}
                  </select>
                )}

                {/* Unmatched: search or add guest */}
                {!entry.resolvedPlayerId && entry.status === 'unmatched' && (
                  <div className="space-y-1">
                    <input
                      type="text"
                      placeholder={t('mod.lineup.searchPlayer')}
                      className="w-full rounded border border-input bg-background px-2 py-1 text-sm"
                      value={searchQueries[i] ?? ''}
                      onChange={(e) => searchPlayers(i, e.target.value)}
                    />
                    {(searchResults[i] ?? []).length > 0 && (
                      <ul className="rounded border border-input bg-background text-sm divide-y max-h-36 overflow-y-auto">
                        {(searchResults[i] ?? []).map((p) => (
                          <li key={p.id}>
                            <button
                              type="button"
                              className="w-full px-2 py-1.5 text-left hover:bg-muted"
                              onClick={() => resolveEntry(i, p)}
                            >
                              <PlayerChip
                                name={p.sheet_name}
                                shirtNumber={p.shirt_number}
                                avatarUrl={p.avatar_url}
                                status="matched"
                              />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addGuest(i)}
                      disabled={addingGuest.has(i)}
                    >
                      {addingGuest.has(i) ? t('common.loading') : `${t('mod.lineup.addGuest')} "${searchQueries[i]?.trim() || entry.raw}"`}
                    </Button>
                  </div>
                )}

                {/* Alias save checkbox — shown after resolving an originally-unmatched entry */}
                {entry.resolvedPlayerId != null && entry.originallyUnmatched && (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5"
                      checked={saveAliasMap[i] ?? false}
                      onChange={(e) =>
                        setSaveAliasMap((prev) => ({ ...prev, [i]: e.target.checked }))
                      }
                    />
                    Remember &ldquo;{entry.raw}&rdquo; as alias for {entry.resolvedName}
                  </label>
                )}
              </div>
            ))}
          </div>

          {saveError && <p className="text-sm text-destructive">{saveError}</p>}
          {hasUnresolved && (
            <p className="text-sm text-amber-600">
              Ainda há nomes por resolver. Podes guardar e eles serão excluídos.
            </p>
          )}
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || resolvedCount === 0}
            className="w-full bg-fcda-navy text-white hover:bg-fcda-navy/90"
          >
            {isSaving ? t('mod.lineup.saving') : `${t('mod.lineup.saveLineup')} (${resolvedCount})`}
          </Button>
        </div>
      )}
    </div>
  )
}

function CurrentTeamDropZone({
  team,
  players,
  setDraggedPlayerId,
  onDrop,
  onCaptain,
  captainLabel,
  makeCaptainLabel,
  captainColumnLabel,
  emptyLabel,
  title,
}: {
  team: 'a' | 'b' | null
  players: CurrentPlayer[]
  setDraggedPlayerId: (playerId: string | null) => void
  onDrop: (team: 'a' | 'b' | null, event: DragEvent<HTMLElement>) => void
  onCaptain: (playerId: string) => void
  captainLabel: string
  makeCaptainLabel: string
  captainColumnLabel: string
  emptyLabel?: string
  title?: string
}) {
  return (
    <section
      data-testid={team ? `drop-team-${team}` : 'drop-unassigned'}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => onDrop(team, event)}
      className="space-y-2"
    >
      {team ? (
        <TeamHeader team={team} />
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 px-2.5 py-1.5">
          <p className="text-sm font-semibold text-muted-foreground">{title}</p>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        <div className="grid grid-cols-[minmax(0,1fr)_2rem] items-center gap-2 border-b border-border px-2.5 py-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {players.length} {players.length === 1 ? 'player' : 'players'}
          </p>
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {captainColumnLabel}
          </p>
        </div>
        <div className="min-h-10 divide-y divide-border/70">
          {players.length === 0 ? (
            <p className="px-2.5 py-2.5 text-center text-xs text-muted-foreground">
              {emptyLabel ?? 'Drop players here'}
            </p>
          ) : (
            players.map((player) => (
              <div
                key={player.player_id}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData('text/plain', player.player_id)
                  event.dataTransfer.effectAllowed = 'move'
                  setDraggedPlayerId(player.player_id)
                }}
                onDragEnd={() => setDraggedPlayerId(null)}
                className="grid cursor-grab grid-cols-[minmax(0,1fr)_2rem] items-center gap-2 px-2.5 py-1.5 active:cursor-grabbing"
              >
                <PlayerChip
                  name={player.sheet_name}
                  shirtNumber={player.shirt_number}
                  avatarUrl={player.avatar_url}
                  status="matched"
                  className="w-full"
                />
                <button
                  type="button"
                  aria-label={player.is_captain ? captainLabel : makeCaptainLabel}
                  aria-pressed={player.is_captain}
                  disabled={!player.team}
                  onClick={() => onCaptain(player.player_id)}
                  className={[
                    'flex h-8 w-8 items-center justify-center rounded-md border text-xs font-bold transition-colors',
                    player.is_captain
                      ? 'border-fcda-gold bg-fcda-gold/30 text-fcda-navy'
                      : 'border-fcda-navy/20 bg-white text-fcda-navy hover:border-fcda-navy/50',
                    !player.team ? 'cursor-not-allowed opacity-40 hover:border-fcda-navy/20' : '',
                  ].join(' ')}
                >
                  C
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
