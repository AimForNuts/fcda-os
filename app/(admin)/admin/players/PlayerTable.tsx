'use client'

import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import type { PlayerRow } from './page'

const POSITIONS = ['GK', 'CB', 'CM', 'W', 'ST'] as const

type ProfileResult = { id: string; display_name: string }

export function PlayerTable({ players: initial }: { players: PlayerRow[] }) {
  const { t } = useTranslation()
  const [rows, setRows] = useState<PlayerRow[]>(initial)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, { sheet_name: string; shirt_number: string }>>({})
  const [aliasInput, setAliasInput] = useState<Record<string, string>>({})
  const [showAliasInput, setShowAliasInput] = useState<Set<string>>(new Set())
  const [linkingPlayerId, setLinkingPlayerId] = useState<string | null>(null)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [userSearchResults, setUserSearchResults] = useState<ProfileResult[]>([])
  const [loadingMap, setLoadingMap] = useState<Record<string, string>>({})
  const [errorMap, setErrorMap] = useState<Record<string, string>>({})
  const [editingRatingId, setEditingRatingId] = useState<string | null>(null)
  const [ratingInput, setRatingInput] = useState<Record<string, string>>({})
  const [editingPositionsId, setEditingPositionsId] = useState<string | null>(null)
  const [positionsInput, setPositionsInput] = useState<Record<string, string[]>>({})
  const userSearchAbort = useRef<AbortController | null>(null)

  function setLoading(playerId: string, key: string | null) {
    setLoadingMap((prev) => {
      const next = { ...prev }
      if (key) next[playerId] = key
      else delete next[playerId]
      return next
    })
  }

  function setError(playerId: string, msg: string | null) {
    setErrorMap((prev) => {
      const next = { ...prev }
      if (msg) next[playerId] = msg
      else delete next[playerId]
      return next
    })
  }

  async function patchPlayer(playerId: string, loadingKey: string, body: object): Promise<boolean> {
    setLoading(playerId, loadingKey)
    setError(playerId, null)
    try {
      const res = await fetch(`/api/admin/players/${playerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      return true
    } catch {
      setError(playerId, t('admin.errors.playerUpdateFailed'))
      return false
    } finally {
      setLoading(playerId, null)
    }
  }

  function startEdit(player: PlayerRow) {
    setEditingId(player.id)
    setEditValues((prev) => ({
      ...prev,
      [player.id]: {
        sheet_name: player.sheet_name,
        shirt_number: player.shirt_number?.toString() ?? '',
      },
    }))
  }

  async function saveEdit(playerId: string) {
    const vals = editValues[playerId]
    if (!vals) return
    const shirtNum = vals.shirt_number === '' ? null : parseInt(vals.shirt_number, 10)
    const ok = await patchPlayer(playerId, 'edit', {
      sheet_name: vals.sheet_name,
      shirt_number: isNaN(shirtNum as number) ? null : shirtNum,
    })
    if (ok) {
      setRows((prev) =>
        prev.map((r) =>
          r.id === playerId
            ? {
                ...r,
                sheet_name: vals.sheet_name,
                shirt_number: isNaN(shirtNum as number) ? null : shirtNum,
              }
            : r
        )
      )
      setEditingId(null)
    }
  }

  async function saveRating(playerId: string) {
    const val = parseFloat(ratingInput[playerId] ?? '')
    if (isNaN(val) || val < 0 || val > 10) return
    const ok = await patchPlayer(playerId, 'rating', { current_rating: val })
    if (ok) {
      setRows((prev) =>
        prev.map((r) => (r.id === playerId ? { ...r, current_rating: val } : r))
      )
      setEditingRatingId(null)
    }
  }

  async function savePositions(playerId: string) {
    const positions = positionsInput[playerId] ?? []
    const ok = await patchPlayer(playerId, 'positions', { preferred_positions: positions })
    if (ok) {
      setRows((prev) =>
        prev.map((r) => (r.id === playerId ? { ...r, preferred_positions: positions } : r))
      )
      setEditingPositionsId(null)
    }
  }

  async function addAlias(playerId: string) {
    const display = aliasInput[playerId]?.trim()
    if (!display) return
    setLoading(playerId, 'alias')
    setError(playerId, null)
    try {
      const res = await fetch(`/api/admin/players/${playerId}/aliases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias_display: display }),
      })
      if (!res.ok) throw new Error()
      const newAlias: { id: string; alias_display: string } = await res.json()
      setRows((prev) =>
        prev.map((r) =>
          r.id === playerId ? { ...r, aliases: [...r.aliases, newAlias] } : r
        )
      )
      setAliasInput((prev) => ({ ...prev, [playerId]: '' }))
      setShowAliasInput((prev) => { const s = new Set(prev); s.delete(playerId); return s })
    } catch {
      setError(playerId, t('admin.errors.aliasFailed'))
    } finally {
      setLoading(playerId, null)
    }
  }

  async function removeAlias(playerId: string, aliasId: string) {
    setLoading(playerId, `alias-${aliasId}`)
    setError(playerId, null)
    try {
      const res = await fetch(`/api/admin/players/${playerId}/aliases/${aliasId}`, {
        method: 'DELETE',
      })
      if (!res.ok && res.status !== 204) throw new Error()
      setRows((prev) =>
        prev.map((r) =>
          r.id === playerId
            ? { ...r, aliases: r.aliases.filter((a) => a.id !== aliasId) }
            : r
        )
      )
    } catch {
      setError(playerId, t('admin.errors.aliasFailed'))
    } finally {
      setLoading(playerId, null)
    }
  }

  async function searchUsers(q: string) {
    setUserSearchQuery(q)
    if (!q.trim()) { setUserSearchResults([]); return }
    userSearchAbort.current?.abort()
    const controller = new AbortController()
    userSearchAbort.current = controller
    try {
      const res = await fetch(
        `/api/admin/users/search?q=${encodeURIComponent(q)}`,
        { signal: controller.signal }
      )
      if (res.ok) setUserSearchResults(await res.json())
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setUserSearchResults([])
    }
  }

  async function handleLinkUser(playerId: string, profile: ProfileResult) {
    const ok = await patchPlayer(playerId, 'link', { profile_id: profile.id })
    if (ok) {
      setRows((prev) =>
        prev.map((r) =>
          r.id === playerId
            ? { ...r, profile_id: profile.id, profile_name: profile.display_name }
            : r
        )
      )
      setLinkingPlayerId(null)
      setUserSearchQuery('')
      setUserSearchResults([])
    }
  }

  async function handleUnlinkUser(playerId: string) {
    const ok = await patchPlayer(playerId, 'unlink', { profile_id: null })
    if (ok) {
      setRows((prev) =>
        prev.map((r) =>
          r.id === playerId ? { ...r, profile_id: null, profile_name: null } : r
        )
      )
    }
  }

  return (
    <div className="space-y-2">
      {rows.map((player) => {
        const isEditing = editingId === player.id
        const isLinking = linkingPlayerId === player.id
        const isLoading = !!loadingMap[player.id]
        const error = errorMap[player.id]
        const vals = editValues[player.id]
        const showAlias = showAliasInput.has(player.id)

        return (
          <div key={player.id} className="rounded-lg border bg-background p-4 space-y-3">
            {/* Header row: name + shirt + profile + actions */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-0.5 flex-1 min-w-0">
                {isEditing ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="text"
                      className="rounded border border-input bg-background px-2 py-1 text-sm font-medium w-48"
                      value={vals?.sheet_name ?? ''}
                      onChange={(e) =>
                        setEditValues((prev) => ({
                          ...prev,
                          [player.id]: { ...prev[player.id], sheet_name: e.target.value },
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(player.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      autoFocus
                    />
                    <input
                      type="number"
                      placeholder="#"
                      className="rounded border border-input bg-background px-2 py-1 text-sm w-16"
                      value={vals?.shirt_number ?? ''}
                      onChange={(e) =>
                        setEditValues((prev) => ({
                          ...prev,
                          [player.id]: { ...prev[player.id], shirt_number: e.target.value },
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(player.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                    />
                    <Button size="sm" className="bg-fcda-navy text-white hover:bg-fcda-navy/90 text-xs" onClick={() => saveEdit(player.id)} disabled={isLoading}>
                      {loadingMap[player.id] === 'edit' ? '...' : t('admin.saveEdit')}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => setEditingId(null)}>
                      {t('admin.cancelEdit')}
                    </Button>
                  </div>
                ) : (
                  <p className="font-medium text-fcda-navy">
                    {player.shirt_number != null ? `#${player.shirt_number} ` : ''}
                    {player.sheet_name}
                  </p>
                )}

                {/* Linked profile */}
                <p className="text-xs text-muted-foreground">
                  {player.profile_name ?? t('admin.guest')}
                </p>

                {/* Rating */}
                {editingRatingId === player.id ? (
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-muted-foreground">Rating:</span>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.01"
                      className="rounded border border-input bg-background px-2 py-0.5 text-xs w-20"
                      value={ratingInput[player.id] ?? ''}
                      onChange={(e) =>
                        setRatingInput((prev) => ({ ...prev, [player.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveRating(player.id)
                        if (e.key === 'Escape') setEditingRatingId(null)
                      }}
                      autoFocus
                    />
                    <Button
                      size="sm"
                      className="bg-fcda-navy text-white hover:bg-fcda-navy/90 text-xs h-6 px-2"
                      onClick={() => saveRating(player.id)}
                      disabled={isLoading}
                    >
                      {loadingMap[player.id] === 'rating' ? '...' : t('admin.saveEdit')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-6 px-2"
                      onClick={() => setEditingRatingId(null)}
                    >
                      {t('admin.cancelEdit')}
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-fcda-navy cursor-pointer mt-0.5 text-left"
                    onClick={() => {
                      setEditingRatingId(player.id)
                      setRatingInput((prev) => ({
                        ...prev,
                        [player.id]: player.current_rating?.toFixed(2) ?? '',
                      }))
                    }}
                  >
                    Rating: {player.current_rating != null ? player.current_rating.toFixed(2) : '–'}
                  </button>
                )}

                {/* Positions */}
                {editingPositionsId === player.id ? (
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {POSITIONS.map((pos) => {
                      const selected = (positionsInput[player.id] ?? []).includes(pos)
                      return (
                        <button
                          key={pos}
                          type="button"
                          onClick={() =>
                            setPositionsInput((prev) => {
                              const current = prev[player.id] ?? []
                              const isSelected = current.includes(pos)
                              return {
                                ...prev,
                                [player.id]: isSelected
                                  ? current.filter((p) => p !== pos)
                                  : [...current, pos],
                              }
                            })
                          }
                          className={`rounded px-2 py-0.5 text-xs border transition-colors ${
                            selected
                              ? 'bg-fcda-navy text-white border-fcda-navy'
                              : 'bg-background text-fcda-navy border-fcda-navy/40 hover:border-fcda-navy'
                          }`}
                        >
                          {pos}
                        </button>
                      )
                    })}
                    <Button
                      size="sm"
                      className="bg-fcda-navy text-white hover:bg-fcda-navy/90 text-xs h-6 px-2"
                      onClick={() => savePositions(player.id)}
                      disabled={isLoading}
                    >
                      {loadingMap[player.id] === 'positions' ? '...' : t('admin.saveEdit')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-6 px-2"
                      onClick={() => setEditingPositionsId(null)}
                    >
                      {t('admin.cancelEdit')}
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-fcda-navy cursor-pointer mt-0.5 text-left"
                    onClick={() => {
                      setEditingPositionsId(player.id)
                      setPositionsInput((prev) => ({
                        ...prev,
                        [player.id]: [...player.preferred_positions],
                      }))
                    }}
                  >
                    {player.preferred_positions.length > 0
                      ? `Positions: ${player.preferred_positions.join(', ')}`
                      : 'Positions: –'}
                  </button>
                )}
              </div>

              {/* Actions */}
              {!isEditing && (
                <div className="flex flex-wrap gap-1 shrink-0">
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => startEdit(player)} disabled={isLoading}>
                    {t('admin.edit')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => setShowAliasInput((prev) => { const s = new Set(prev); s.add(player.id); return s })}
                    disabled={isLoading}
                  >
                    {t('admin.addAlias')}
                  </Button>
                  {player.profile_id ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-muted-foreground"
                      onClick={() => handleUnlinkUser(player.id)}
                      disabled={isLoading}
                    >
                      {loadingMap[player.id] === 'unlink' ? '...' : t('admin.unlinkUser')}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => {
                        setLinkingPlayerId(player.id)
                        setUserSearchQuery('')
                        setUserSearchResults([])
                      }}
                      disabled={isLoading}
                    >
                      {t('admin.linkUser')}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Aliases */}
            {(player.aliases.length > 0 || showAlias) && (
              <div className="space-y-1.5">
                <div className="flex flex-wrap gap-1.5">
                  {player.aliases.map((a) => (
                    <span
                      key={a.id}
                      className="inline-flex items-center gap-1 rounded-full border bg-fcda-ice border-fcda-navy/20 px-2.5 py-0.5 text-xs text-fcda-navy"
                    >
                      {a.alias_display}
                      <button
                        type="button"
                        aria-label={`Remove alias ${a.alias_display}`}
                        className="text-fcda-navy/50 hover:text-destructive ml-0.5"
                        onClick={() => removeAlias(player.id, a.id)}
                        disabled={loadingMap[player.id] === `alias-${a.id}`}
                      >
                        &#x2715;
                      </button>
                    </span>
                  ))}
                </div>

                {showAlias && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={t('admin.addAlias')}
                      className="rounded border border-input bg-background px-2 py-1 text-sm flex-1"
                      value={aliasInput[player.id] ?? ''}
                      onChange={(e) =>
                        setAliasInput((prev) => ({ ...prev, [player.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addAlias(player.id)
                        if (e.key === 'Escape') {
                          setShowAliasInput((prev) => { const s = new Set(prev); s.delete(player.id); return s })
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      size="sm"
                      className="bg-fcda-navy text-white hover:bg-fcda-navy/90 text-xs"
                      onClick={() => addAlias(player.id)}
                      disabled={loadingMap[player.id] === 'alias'}
                    >
                      {loadingMap[player.id] === 'alias' ? '...' : t('admin.saveEdit')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs"
                      onClick={() =>
                        setShowAliasInput((prev) => { const s = new Set(prev); s.delete(player.id); return s })
                      }
                    >
                      {t('admin.cancelEdit')}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Link user search */}
            {isLinking && (
              <div className="space-y-1">
                <input
                  type="text"
                  placeholder={t('admin.searchUser')}
                  className="w-full rounded border border-input bg-background px-2 py-1 text-sm"
                  value={userSearchQuery}
                  onChange={(e) => searchUsers(e.target.value)}
                  autoFocus
                />
                {userSearchResults.length > 0 && (
                  <ul className="rounded border border-input bg-background text-sm divide-y max-h-32 overflow-y-auto">
                    {userSearchResults.map((u) => (
                      <li key={u.id}>
                        <button
                          type="button"
                          className="w-full px-2 py-1.5 text-left hover:bg-muted"
                          onClick={() => handleLinkUser(player.id, u)}
                        >
                          {u.display_name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setLinkingPlayerId(null)
                    setUserSearchQuery('')
                    setUserSearchResults([])
                  }}
                >
                  {t('admin.cancelEdit')}
                </Button>
              </div>
            )}

            {error && (
              <p role="alert" className="text-xs text-destructive">{error}</p>
            )}
          </div>
        )
      })}

      {rows.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Sem jogadores registados.
        </p>
      )}
    </div>
  )
}
