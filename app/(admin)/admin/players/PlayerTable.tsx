'use client'

import { type FormEvent, useDeferredValue, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, Link2, ListPlus, MessageSquare, Pencil, Trash2, Unlink, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PlayerIdentity } from '@/components/player/PlayerIdentity'
import {
  DEFAULT_NATIONALITY,
  NATIONALITY_OPTIONS,
  getNationalityLabel,
  normalizeNationality,
} from '@/lib/nationality'
import type { PlayerRow } from './page'

const POSITIONS = ['GK', 'CB', 'CM', 'W', 'ST'] as const

type ProfileResult = { id: string; display_name: string }

function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-PT')
}

function formatGameOption(game: { date: string; location: string }) {
  const date = new Date(game.date)
  const dateLabel = date.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  return `${dateLabel} · ${game.location}`
}

export function PlayerTable({ players: initial }: { players: PlayerRow[] }) {
  const { t } = useTranslation()
  const [rows, setRows] = useState<PlayerRow[]>(initial)
  const [searchValue, setSearchValue] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, { sheet_name: string; shirt_number: string; nationality: string }>>({})
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
  const [feedbackTarget, setFeedbackTarget] = useState<PlayerRow | null>(null)
  const [feedbackGameId, setFeedbackGameId] = useState('')
  const [feedbackRating, setFeedbackRating] = useState('')
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const deferredSearchValue = useDeferredValue(searchValue)
  const userSearchAbort = useRef<AbortController | null>(null)
  const photoInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const filteredRows = useMemo(() => {
    const query = normalizeSearch(deferredSearchValue.trim())
    if (!query) return rows

    return rows.filter((player) => {
      const values = [
        player.sheet_name,
        player.shirt_number?.toString() ?? '',
        player.nationality,
        player.profile_name ?? '',
        ...player.preferred_positions,
        ...player.aliases.map((alias) => alias.alias_display),
      ]

      return values.some((value) => normalizeSearch(value).includes(query))
    })
  }, [deferredSearchValue, rows])

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
        nationality: normalizeNationality(player.nationality),
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
      nationality: normalizeNationality(vals.nationality),
    })
    if (ok) {
      setRows((prev) =>
        prev.map((r) =>
          r.id === playerId
            ? {
                ...r,
                sheet_name: vals.sheet_name,
                shirt_number: isNaN(shirtNum as number) ? null : shirtNum,
                nationality: normalizeNationality(vals.nationality),
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
      if (res.status === 409) throw new Error(t('admin.errors.aliasDuplicate'))
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

  async function handlePhotoUpload(playerId: string, file: File | null) {
    if (!file) return

    setLoading(playerId, 'photo-upload')
    setError(playerId, null)

    try {
      const body = new FormData()
      body.set('file', file)
      const res = await fetch(`/api/admin/players/${playerId}/photo`, {
        method: 'POST',
        body,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Failed to upload photo')
      }
      setRows((prev) =>
        prev.map((row) =>
          row.id === playerId
            ? { ...row, avatar_url: typeof data.avatar_url === 'string' ? data.avatar_url : null }
            : row
        )
      )
    } catch (err) {
      setError(playerId, err instanceof Error ? err.message : t('admin.errors.playerUpdateFailed'))
    } finally {
      setLoading(playerId, null)
      const input = photoInputRefs.current[playerId]
      if (input) input.value = ''
    }
  }

  async function handlePhotoDelete(playerId: string) {
    setLoading(playerId, 'photo-delete')
    setError(playerId, null)

    try {
      const res = await fetch(`/api/admin/players/${playerId}/photo`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Failed to delete photo')
      }
      setRows((prev) =>
        prev.map((row) => (row.id === playerId ? { ...row, avatar_url: null } : row))
      )
    } catch (err) {
      setError(playerId, err instanceof Error ? err.message : t('admin.errors.playerUpdateFailed'))
    } finally {
      setLoading(playerId, null)
    }
  }

  function openFeedbackModal(player: PlayerRow) {
    setFeedbackTarget(player)
    setFeedbackGameId(player.feedback_games[0]?.id ?? '')
    setFeedbackRating('')
    setFeedbackText('')
    setFeedbackSubmitted(false)
    setFeedbackError(null)
  }

  function closeFeedbackModal() {
    if (feedbackSubmitting) return
    setFeedbackTarget(null)
    setFeedbackGameId('')
    setFeedbackRating('')
    setFeedbackText('')
    setFeedbackSubmitted(false)
    setFeedbackError(null)
  }

  async function submitFeedback(e: FormEvent) {
    e.preventDefault()
    if (!feedbackTarget) return

    const rating = parseFloat(feedbackRating)
    if (!feedbackGameId || isNaN(rating) || rating < 0 || rating > 10) {
      setFeedbackError(t('admin.errors.feedbackFailed'))
      return
    }

    setFeedbackSubmitting(true)
    setFeedbackError(null)
    try {
      const res = await fetch(`/api/admin/players/${feedbackTarget.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: feedbackGameId,
          rating,
          feedback: feedbackText.trim() || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : t('admin.errors.feedbackFailed'))
      }
      setFeedbackSubmitted(true)
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : t('admin.errors.feedbackFailed'))
    } finally {
      setFeedbackSubmitting(false)
    }
  }

  return (
    <div className="min-w-0 space-y-3">
      <div className="sticky top-20 z-40 -mx-4 border-b border-border bg-background px-4 py-3 shadow-sm">
        <div className="w-full max-w-md">
          <label htmlFor="admin-player-search" className="sr-only">
            {t('admin.searchPlayers')}
          </label>
          <Input
            id="admin-player-search"
            type="search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder={t('admin.searchPlayers')}
          />
        </div>
        <datalist id="admin-player-nationality-options">
          {NATIONALITY_OPTIONS.map((code) => (
            <option key={code} value={code}>
              {getNationalityLabel(code)}
            </option>
          ))}
        </datalist>
      </div>

      {filteredRows.map((player) => {
        const isEditing = editingId === player.id
        const isLinking = linkingPlayerId === player.id
        const isLoading = !!loadingMap[player.id]
        const error = errorMap[player.id]
        const vals = editValues[player.id]
        const showAlias = showAliasInput.has(player.id)

        return (
          <div key={player.id} className="touch-manipulation space-y-2 rounded-lg border bg-background p-3 sm:space-y-3 sm:p-4">
            {/* Header row: name + shirt + profile + actions */}
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between md:gap-4">
              <div className="min-w-0 flex-1 space-y-0.5">
                {isEditing ? (
                  <div className="flex flex-row flex-wrap items-center gap-1.5">
                    <input
                      type="text"
                      className="min-w-[7rem] flex-1 rounded border border-input bg-background px-2 py-1 text-sm font-medium sm:w-48 sm:flex-none"
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
                      className="w-14 shrink-0 rounded border border-input bg-background px-2 py-1 text-sm sm:w-16"
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
                    <input
                      type="text"
                      list="admin-player-nationality-options"
                      placeholder={DEFAULT_NATIONALITY}
                      className="w-14 shrink-0 rounded border border-input bg-background px-2 py-1 text-sm uppercase sm:w-20"
                      value={vals?.nationality ?? DEFAULT_NATIONALITY}
                      maxLength={2}
                      onChange={(e) =>
                        setEditValues((prev) => ({
                          ...prev,
                          [player.id]: {
                            ...prev[player.id],
                            nationality: e.target.value.toUpperCase().slice(0, 2),
                          },
                        }))
                      }
                      onBlur={() =>
                        setEditValues((prev) => ({
                          ...prev,
                          [player.id]: {
                            ...prev[player.id],
                            nationality: normalizeNationality(prev[player.id]?.nationality),
                          },
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(player.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                    />
                    <Button
                      size="sm"
                      className="shrink-0 bg-fcda-navy text-white hover:bg-fcda-navy/90 text-xs"
                      onClick={() => saveEdit(player.id)}
                      disabled={isLoading}
                    >
                      {loadingMap[player.id] === 'edit' ? '...' : t('admin.saveEdit')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 text-xs"
                      onClick={() => setEditingId(null)}
                    >
                      {t('admin.cancelEdit')}
                    </Button>
                  </div>
                ) : (
                  <PlayerIdentity
                    name={player.sheet_name}
                    shirtNumber={player.shirt_number}
                    nationality={player.nationality}
                    avatarUrl={player.avatar_url}
                    avatarSize="sm"
                    nameClassName="font-medium text-fcda-navy"
                  />
                )}

                {/* Linked profile */}
                <p className="text-xs text-muted-foreground">
                  {player.profile_name ?? t('admin.guest')}
                </p>

                {/* Rating */}
                {editingRatingId === player.id ? (
                  <div className="mt-1 flex flex-row flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Rating:</span>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.01"
                      className="w-20 rounded border border-input bg-background px-2 py-0.5 text-xs"
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
                      className="h-6 shrink-0 bg-fcda-navy px-2 text-white hover:bg-fcda-navy/90 text-xs"
                      onClick={() => saveRating(player.id)}
                      disabled={isLoading}
                    >
                      {loadingMap[player.id] === 'rating' ? '...' : t('admin.saveEdit')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 shrink-0 px-2 text-xs"
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
                  <div
                    className="mt-1 flex flex-wrap items-center gap-1.5"
                    onKeyDown={(e) => { if (e.key === 'Escape') setEditingPositionsId(null) }}
                  >
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
                      className="h-6 shrink-0 bg-fcda-navy px-2 text-white hover:bg-fcda-navy/90 text-xs"
                      onClick={() => savePositions(player.id)}
                      disabled={isLoading}
                    >
                      {loadingMap[player.id] === 'positions' ? '...' : t('admin.saveEdit')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 shrink-0 px-2 text-xs"
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
                <div className="w-full min-w-0 md:max-w-xl md:w-auto lg:max-w-none">
                  <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] md:w-auto md:flex-wrap md:justify-end md:gap-1 md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden">
                    <input
                      ref={(node) => {
                        photoInputRefs.current[player.id] = node
                      }}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => handlePhotoUpload(player.id, e.target.files?.[0] ?? null)}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 shrink-0 gap-0 px-2.5 text-xs md:gap-1.5 md:px-3"
                      title={t('admin.edit')}
                      onClick={() => startEdit(player)}
                      disabled={isLoading}
                    >
                      <Pencil className="size-3.5 shrink-0" aria-hidden />
                      <span className="max-md:sr-only">{t('admin.edit')}</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 shrink-0 gap-0 px-2.5 text-xs md:gap-1.5 md:px-3"
                      title={
                        player.avatar_url ? 'Substituir foto' : 'Adicionar foto'
                      }
                      onClick={() => photoInputRefs.current[player.id]?.click()}
                      disabled={isLoading}
                    >
                      <Camera className="size-3.5 shrink-0" aria-hidden />
                      <span className="max-md:sr-only">
                        {loadingMap[player.id] === 'photo-upload'
                          ? '...'
                          : player.avatar_url
                            ? 'Substituir foto'
                            : 'Adicionar foto'}
                      </span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 shrink-0 gap-0 px-2.5 text-xs text-muted-foreground md:gap-1.5 md:px-3"
                      title="Remover foto"
                      onClick={() => handlePhotoDelete(player.id)}
                      disabled={isLoading || player.avatar_url == null}
                    >
                      <Trash2 className="size-3.5 shrink-0" aria-hidden />
                      <span className="max-md:sr-only">
                        {loadingMap[player.id] === 'photo-delete' ? '...' : 'Remover foto'}
                      </span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 shrink-0 gap-0 px-2.5 text-xs md:gap-1.5 md:px-3"
                      title={t('admin.addPlayerFeedback')}
                      onClick={() => openFeedbackModal(player)}
                      disabled={isLoading}
                    >
                      <MessageSquare className="size-3.5 shrink-0" aria-hidden />
                      <span className="max-md:sr-only">{t('admin.addPlayerFeedback')}</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 shrink-0 gap-0 px-2.5 text-xs md:gap-1.5 md:px-3"
                      title={t('admin.addAlias')}
                      onClick={() =>
                        setShowAliasInput((prev) => {
                          const s = new Set(prev)
                          s.add(player.id)
                          return s
                        })
                      }
                      disabled={isLoading}
                    >
                      <ListPlus className="size-3.5 shrink-0" aria-hidden />
                      <span className="max-md:sr-only">{t('admin.addAlias')}</span>
                    </Button>
                    {player.profile_id ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 shrink-0 gap-0 px-2.5 text-xs text-muted-foreground md:gap-1.5 md:px-3"
                        title={t('admin.unlinkUser')}
                        onClick={() => handleUnlinkUser(player.id)}
                        disabled={isLoading}
                      >
                        <Unlink className="size-3.5 shrink-0" aria-hidden />
                        <span className="max-md:sr-only">
                          {loadingMap[player.id] === 'unlink' ? '...' : t('admin.unlinkUser')}
                        </span>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 shrink-0 gap-0 px-2.5 text-xs md:gap-1.5 md:px-3"
                        title={t('admin.linkUser')}
                        onClick={() => {
                          setLinkingPlayerId(player.id)
                          setUserSearchQuery('')
                          setUserSearchResults([])
                        }}
                        disabled={isLoading}
                      >
                        <Link2 className="size-3.5 shrink-0" aria-hidden />
                        <span className="max-md:sr-only">{t('admin.linkUser')}</span>
                      </Button>
                    )}
                  </div>
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
                  <div className="flex flex-row flex-wrap items-center gap-1.5">
                    <input
                      type="text"
                      placeholder={t('admin.addAlias')}
                      className="min-w-[10rem] flex-1 rounded border border-input bg-background px-2 py-1 text-sm"
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
                      className="shrink-0 bg-fcda-navy text-white hover:bg-fcda-navy/90 text-xs"
                      onClick={() => addAlias(player.id)}
                      disabled={loadingMap[player.id] === 'alias'}
                    >
                      {loadingMap[player.id] === 'alias' ? '...' : t('admin.saveEdit')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 text-xs"
                      onClick={() =>
                        setShowAliasInput((prev) => {
                          const s = new Set(prev)
                          s.delete(player.id)
                          return s
                        })
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

      {filteredRows.length === 0 && (
        <p className="rounded-lg border px-4 py-8 text-center text-sm text-muted-foreground">
          {rows.length === 0 ? 'Sem jogadores registados.' : t('admin.noPlayersFound')}
        </p>
      )}

      {feedbackTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-player-feedback-title"
            className="max-h-[92vh] w-full max-w-lg overflow-hidden rounded-t-xl border border-border bg-background shadow-xl sm:rounded-xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-5">
              <div className="min-w-0 space-y-1">
                <h2 id="admin-player-feedback-title" className="text-lg font-bold text-foreground">
                  {t('admin.addPlayerFeedback')}
                </h2>
                <PlayerIdentity
                  name={feedbackTarget.sheet_name}
                  shirtNumber={feedbackTarget.shirt_number}
                  nationality={feedbackTarget.nationality}
                  avatarUrl={feedbackTarget.avatar_url}
                  avatarSize="sm"
                />
              </div>
              <button
                type="button"
                onClick={closeFeedbackModal}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={t('common.cancel')}
                disabled={feedbackSubmitting}
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[62vh] overflow-y-auto px-4 py-4 sm:px-5">
              {feedbackSubmitted ? (
                <p className="text-sm text-muted-foreground">{t('admin.playerFeedbackSubmitted')}</p>
              ) : feedbackTarget.feedback_games.length === 0 ? (
                <p className="rounded-lg border px-4 py-8 text-center text-sm text-muted-foreground">
                  {t('admin.noFeedbackGames')}
                </p>
              ) : (
                <form id="admin-player-feedback-form" onSubmit={submitFeedback} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="admin-feedback-game" className="text-sm font-medium text-foreground">
                      {t('admin.feedbackGame')}
                    </label>
                    <select
                      id="admin-feedback-game"
                      value={feedbackGameId}
                      onChange={(e) => setFeedbackGameId(e.target.value)}
                      disabled={feedbackSubmitting}
                      className="h-9 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                    >
                      {feedbackTarget.feedback_games.map((game) => (
                        <option key={game.id} value={game.id}>
                          {formatGameOption(game)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="admin-feedback-rating" className="text-sm font-medium text-foreground">
                      Nota (0-10)
                    </label>
                    <input
                      id="admin-feedback-rating"
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      value={feedbackRating}
                      onChange={(e) => {
                        const raw = e.target.value
                        const n = parseFloat(raw)
                        const clamped = !isNaN(n) ? String(Math.min(10, Math.max(0, n))) : raw
                        setFeedbackRating(clamped)
                      }}
                      disabled={feedbackSubmitting}
                      className="h-9 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-right text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 sm:w-28"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="admin-feedback-text" className="text-sm font-medium text-foreground">
                      {t('admin.feedbackComment')}
                    </label>
                    <textarea
                      id="admin-feedback-text"
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Comentário (opcional)"
                      disabled={isNaN(parseFloat(feedbackRating)) || feedbackSubmitting}
                      maxLength={300}
                      rows={4}
                      className="w-full resize-none rounded-lg border border-input bg-background px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-40"
                    />
                  </div>

                  {feedbackError && <p role="alert" className="text-sm text-destructive">{feedbackError}</p>}
                </form>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-border px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:flex-wrap sm:justify-end sm:px-5">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={closeFeedbackModal}
                disabled={feedbackSubmitting}
              >
                {feedbackSubmitted ? t('admin.closeItem') : t('common.cancel')}
              </Button>
              {!feedbackSubmitted && feedbackTarget.feedback_games.length > 0 && (
                <Button
                  type="submit"
                  form="admin-player-feedback-form"
                  className="w-full sm:w-auto"
                  disabled={feedbackSubmitting}
                >
                  {feedbackSubmitting ? t('matches.ratingSubmitting') : t('matches.ratingSubmit')}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
