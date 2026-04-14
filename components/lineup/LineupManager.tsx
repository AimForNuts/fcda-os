'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { WhatsAppPasteBox } from './WhatsAppPasteBox'
import { PlayerChip } from './PlayerChip'
import { Button } from '@/components/ui/button'
import type { ParsedEntry } from '@/lib/whatsapp/parser'

type ResolvedEntry = {
  raw: string
  normalised: string
  status: 'matched' | 'ambiguous' | 'unmatched'
  matches: Array<{ id: string; sheet_name: string }>
  resolvedPlayerId: string | null
  resolvedName: string | null
  team: 'a' | 'b' | null
}

type CurrentPlayer = {
  player_id: string
  sheet_name: string
  shirt_number: number | null
  team: 'a' | 'b' | null
}

type Props = {
  gameId: string
  currentLineup: CurrentPlayer[]
}

type SearchResult = { id: string; sheet_name: string; shirt_number: number | null }

const TEAM_OPTIONS: Array<'a' | 'b' | null> = ['a', 'b', null]

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
  const searchAbortRefs = useRef<Record<number, AbortController>>({})

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
        team: null,
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
  function resolveEntry(index: number, playerId: string, playerName: string) {
    setEntries((prev) =>
      prev.map((e, i) =>
        i === index
          ? { ...e, resolvedPlayerId: playerId, resolvedName: playerName, status: 'matched' }
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
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheet_name: entry.raw, alias_display: entry.raw }),
      })
      if (res.ok) {
        const { id, sheet_name } = await res.json()
        resolveEntry(index, id, sheet_name)
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
    const players = entries
      .filter((e) => e.resolvedPlayerId != null)
      .map((e) => ({ player_id: e.resolvedPlayerId!, team: e.team ?? null }))

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
      {/* Current lineup (if set) */}
      {currentLineup.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            {t('mod.lineup.current')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {currentLineup.map((p) => (
              <span key={p.player_id} className="inline-flex items-center gap-1.5 rounded-full border bg-fcda-ice border-fcda-navy/20 px-2.5 py-1 text-sm font-medium text-fcda-navy">
                {p.shirt_number != null ? `#${p.shirt_number} ` : ''}{p.sheet_name}
                {p.team && (
                  <span className="ml-1 text-xs text-fcda-navy/60 uppercase">{p.team}</span>
                )}
              </span>
            ))}
          </div>
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
                    status={entry.resolvedPlayerId ? 'matched' : entry.status}
                  />
                  {/* Team toggle */}
                  {entry.resolvedPlayerId && (
                    <div className="flex items-center gap-1 ml-auto">
                      {TEAM_OPTIONS.map((tm) => (
                        <button
                          key={String(tm)}
                          type="button"
                          onClick={() => setTeam(i, tm)}
                          className={`px-2 py-0.5 rounded text-xs font-semibold border transition-colors ${
                            entry.team === tm
                              ? 'bg-fcda-navy text-white border-fcda-navy'
                              : 'bg-white text-fcda-navy border-fcda-navy/30 hover:border-fcda-navy'
                          }`}
                        >
                          {tm === null ? '—' : tm.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Ambiguous: pick from dropdown */}
                {!entry.resolvedPlayerId && entry.status === 'ambiguous' && (
                  <select
                    className="w-full rounded border border-input bg-background px-2 py-1 text-sm"
                    value={entry.resolvedPlayerId ?? ''}
                    onChange={(e) => {
                      const match = entry.matches.find((m) => m.id === e.target.value)
                      if (match) resolveEntry(i, match.id, match.sheet_name)
                    }}
                  >
                    <option value="" disabled>{t('mod.lineup.pickPlayer')}</option>
                    {entry.matches.map((m) => (
                      <option key={m.id} value={m.id}>{m.sheet_name}</option>
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
                              onClick={() => resolveEntry(i, p.id, p.sheet_name)}
                            >
                              {p.shirt_number != null ? `#${p.shirt_number} ` : ''}{p.sheet_name}
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
                      {addingGuest.has(i) ? t('common.loading') : `${t('mod.lineup.addGuest')} "${entry.raw}"`}
                    </Button>
                  </div>
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
