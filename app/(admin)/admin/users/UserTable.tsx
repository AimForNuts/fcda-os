'use client'

import { type FormEvent, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, MessageSquare, Save, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { PlayerIdentity } from '@/components/player/PlayerIdentity'
import type { UserRole } from '@/types'
import type { UserRow } from './page'

type SearchResult = {
  id: string
  sheet_name: string
  shirt_number: number | null
  avatar_url: string | null
}

const POSITIONS = ['GK', 'CB', 'CM', 'W', 'ST'] as const
const USER_DETAIL_TABS = ['account', 'player', 'feedback'] as const

type UserDetailTab = (typeof USER_DETAIL_TABS)[number]

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

export function UserTable({ users: initial }: { users: UserRow[] }) {
  const { t } = useTranslation()
  const [rows, setRows] = useState<UserRow[]>(initial)
  const [listSearchValue, setListSearchValue] = useState('')
  const [loadingMap, setLoadingMap] = useState<Record<string, string>>({})
  const [errorMap, setErrorMap] = useState<Record<string, string>>({})
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const deferredListSearchValue = useDeferredValue(listSearchValue)

  const selectedUser = useMemo(
    () => rows.find((row) => row.id === selectedUserId) ?? null,
    [rows, selectedUserId]
  )

  const filteredRows = useMemo(() => {
    const query = normalizeSearch(deferredListSearchValue.trim())
    if (!query) return rows

    return rows.filter((user) => {
      const values = [
        user.display_name,
        user.approved ? t('admin.approved') : t('admin.pending'),
        ...user.roles,
        user.player?.sheet_name ?? '',
        user.player?.shirt_number?.toString() ?? '',
        ...(user.player?.aliases.map((alias) => alias.alias_display) ?? []),
      ]

      return values.some((value) => normalizeSearch(value).includes(query))
    })
  }, [deferredListSearchValue, rows, t])

  function setLoading(userId: string, key: string | null) {
    setLoadingMap((prev) => {
      const next = { ...prev }
      if (key) next[userId] = key
      else delete next[userId]
      return next
    })
  }

  function setError(userId: string, msg: string | null) {
    setErrorMap((prev) => {
      const next = { ...prev }
      if (msg) next[userId] = msg
      else delete next[userId]
      return next
    })
  }

  async function patchUser(userId: string, loadingKey: string, body: object): Promise<boolean> {
    setLoading(userId, loadingKey)
    setError(userId, null)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      return true
    } catch {
      setError(userId, t('admin.errors.roleFailed'))
      return false
    } finally {
      setLoading(userId, null)
    }
  }

  async function patchPlayer(
    playerId: string,
    userId: string,
    loadingKey: string,
    body: object
  ): Promise<boolean> {
    setLoading(userId, loadingKey)
    setError(userId, null)
    try {
      const res = await fetch(`/api/admin/players/${playerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      return true
    } catch {
      setError(userId, t('admin.errors.linkFailed'))
      return false
    } finally {
      setLoading(userId, null)
    }
  }

  function updatePlayer(userId: string, patch: Partial<NonNullable<UserRow['player']>>) {
    setRows((prev) =>
      prev.map((row) =>
        row.id === userId && row.player
          ? { ...row, player: { ...row.player, ...patch } }
          : row
      )
    )
  }

  async function handleUpdatePlayer(
    userId: string,
    playerId: string,
    loadingKey: string,
    body: object,
    patch: Partial<NonNullable<UserRow['player']>>
  ) {
    const ok = await patchPlayer(playerId, userId, loadingKey, body)
    if (ok) updatePlayer(userId, patch)
    return ok
  }

  async function handleAddAlias(userId: string, playerId: string, aliasDisplay: string) {
    const display = aliasDisplay.trim()
    if (!display) return false

    setLoading(userId, 'alias')
    setError(userId, null)
    try {
      const res = await fetch(`/api/admin/players/${playerId}/aliases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias_display: display }),
      })
      if (res.status === 409) throw new Error(t('admin.errors.aliasDuplicate'))
      if (!res.ok) throw new Error(t('admin.errors.aliasFailed'))
      const newAlias: { id: string; alias_display: string } = await res.json()
      setRows((prev) =>
        prev.map((row) =>
          row.id === userId && row.player
            ? { ...row, player: { ...row.player, aliases: [...row.player.aliases, newAlias] } }
            : row
        )
      )
      return true
    } catch (err) {
      setError(userId, err instanceof Error ? err.message : t('admin.errors.aliasFailed'))
      return false
    } finally {
      setLoading(userId, null)
    }
  }

  async function handleRemoveAlias(userId: string, playerId: string, aliasId: string) {
    setLoading(userId, `alias-${aliasId}`)
    setError(userId, null)
    try {
      const res = await fetch(`/api/admin/players/${playerId}/aliases/${aliasId}`, {
        method: 'DELETE',
      })
      if (!res.ok && res.status !== 204) throw new Error()
      setRows((prev) =>
        prev.map((row) =>
          row.id === userId && row.player
            ? {
                ...row,
                player: {
                  ...row.player,
                  aliases: row.player.aliases.filter((alias) => alias.id !== aliasId),
                },
              }
            : row
        )
      )
      return true
    } catch {
      setError(userId, t('admin.errors.aliasFailed'))
      return false
    } finally {
      setLoading(userId, null)
    }
  }

  async function handlePhotoUpload(userId: string, playerId: string, file: File | null) {
    if (!file) return false

    setLoading(userId, 'photo-upload')
    setError(userId, null)
    try {
      const body = new FormData()
      body.set('file', file)
      const res = await fetch(`/api/admin/players/${playerId}/photo`, {
        method: 'POST',
        body,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : t('admin.errors.playerUpdateFailed'))
      }
      updatePlayer(userId, {
        avatar_url: typeof data.avatar_url === 'string' ? data.avatar_url : null,
      })
      return true
    } catch (err) {
      setError(userId, err instanceof Error ? err.message : t('admin.errors.playerUpdateFailed'))
      return false
    } finally {
      setLoading(userId, null)
    }
  }

  async function handlePhotoDelete(userId: string, playerId: string) {
    setLoading(userId, 'photo-delete')
    setError(userId, null)
    try {
      const res = await fetch(`/api/admin/players/${playerId}/photo`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : t('admin.errors.playerUpdateFailed'))
      }
      updatePlayer(userId, { avatar_url: null })
      return true
    } catch (err) {
      setError(userId, err instanceof Error ? err.message : t('admin.errors.playerUpdateFailed'))
      return false
    } finally {
      setLoading(userId, null)
    }
  }

  async function handleApprove(userId: string) {
    const ok = await patchUser(userId, 'approve', { approved: true })
    if (ok) {
      setRows((prev) =>
        prev.map((r) =>
          r.id === userId
            ? {
                ...r,
                approved: true,
                roles: r.roles.includes('player') ? r.roles : [...r.roles, 'player'],
              }
            : r
        )
      )
    }
  }

  async function handleUnapprove(userId: string) {
    if (!window.confirm(t('admin.confirmUnapprove'))) return
    const ok = await patchUser(userId, 'unapprove', { approved: false })
    if (ok) {
      setRows((prev) =>
        prev.map((r) => (r.id === userId ? { ...r, approved: false, roles: [] } : r))
      )
    }
  }

  async function handleUpdateDisplayName(userId: string, displayName: string) {
    const nextName = displayName.trim()
    if (!nextName) return false

    const ok = await patchUser(userId, 'display-name', { display_name: nextName })
    if (ok) {
      setRows((prev) =>
        prev.map((row) => (row.id === userId ? { ...row, display_name: nextName } : row))
      )
    }
    return ok
  }

  async function handleRoleToggle(userId: string, role: 'mod' | 'admin' | 'player', hasRole: boolean) {
    const confirmKey = hasRole ? 'admin.confirmRemoveRole' : 'admin.confirmAddRole'
    if (!window.confirm(t(confirmKey, { role }))) return
    const body = hasRole ? { removeRole: role } : { addRole: role }
    const ok = await patchUser(userId, role, body)
    if (ok) {
      setRows((prev) =>
        prev.map((r) =>
          r.id === userId
            ? {
                ...r,
                roles: hasRole
                  ? (r.roles.filter((rr) => rr !== role) as UserRole[])
                  : ([...r.roles, role] as UserRole[]),
              }
            : r
        )
      )
    }
  }

  async function handleLinkPlayer(
    userId: string,
    player: SearchResult
  ) {
    const ok = await patchPlayer(player.id, userId, 'link', { profile_id: userId })
    if (ok) {
      setRows((prev) =>
        prev.map((r) =>
          r.id === userId
            ? {
                ...r,
                player: {
                  id: player.id,
                  sheet_name: player.sheet_name,
                  shirt_number: player.shirt_number,
                  current_rating: null,
                  preferred_positions: [],
                  avatar_url: player.avatar_url,
                  aliases: [],
                  feedback_games: [],
                },
              }
            : r
        )
      )
    }
    return ok
  }

  async function handleUnlinkPlayer(userId: string, playerId: string) {
    const ok = await patchPlayer(playerId, userId, 'unlink', { profile_id: null })
    if (ok) {
      setRows((prev) => prev.map((r) => (r.id === userId ? { ...r, player: null } : r)))
    }
    return ok
  }

  function openUserDetails(userId: string) {
    setSelectedUserId(userId)
  }

  return (
    <div className="space-y-3">
      <div className="max-w-md">
        <label htmlFor="admin-user-search" className="sr-only">
          {t('admin.searchUsers')}
        </label>
        <Input
          id="admin-user-search"
          type="search"
          value={listSearchValue}
          onChange={(e) => setListSearchValue(e.target.value)}
          placeholder={t('admin.searchUsers')}
        />
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Nome</th>
              <th className="px-4 py-3 text-left font-medium">Jogador / Aliases</th>
              <th className="px-4 py-3 text-left font-medium">Estado</th>
              <th className="px-4 py-3 text-left font-medium">Papéis</th>
              <th className="px-4 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredRows.map((user) => {
              const error = errorMap[user.id]
              const hasMod = user.roles.includes('mod')
              const hasAdmin = user.roles.includes('admin')

              return (
                <tr
                  key={user.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${t('admin.actions')}: ${user.display_name}`}
                  className="cursor-pointer bg-background transition-colors hover:bg-muted/30 focus-visible:bg-muted/30 focus-visible:outline-none"
                  onClick={() => openUserDetails(user.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openUserDetails(user.id)
                    }
                  }}
                >
                  <td className="px-4 py-3 font-medium">{user.display_name}</td>

                  <td className="px-4 py-3">
                    {user.player ? (
                      <div className="space-y-1">
                        <PlayerIdentity
                          name={user.player.sheet_name}
                          shirtNumber={user.player.shirt_number}
                          avatarUrl={user.player.avatar_url}
                          avatarSize="sm"
                          nameClassName="font-medium text-fcda-navy"
                        />
                        {user.player.aliases.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {user.player.aliases.map((a) => (
                              <span
                                key={a.id}
                                className="inline-flex items-center rounded-full bg-fcda-ice border border-fcda-navy/20 px-2 py-0.5 text-xs text-fcda-navy"
                              >
                                {a.alias_display}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">{t('admin.noPlayer')}</span>
                    )}

                    {error && (
                      <p role="alert" className="text-xs text-destructive mt-1">{error}</p>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <Badge
                      variant={user.approved ? 'default' : 'secondary'}
                      className={user.approved ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}
                    >
                      {user.approved ? t('admin.approved') : t('admin.pending')}
                    </Badge>
                  </td>

                  <td className="px-4 py-3">
                    {user.approved && (
                      <div className="flex flex-wrap gap-1">
                        {user.roles.includes('player') && <Badge variant="outline" className="text-xs">Player</Badge>}
                        {hasMod && <Badge variant="outline" className="text-xs text-fcda-navy border-fcda-navy">Mod</Badge>}
                        {hasAdmin && <Badge variant="outline" className="text-xs text-fcda-gold border-fcda-gold">Admin</Badge>}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={(event) => {
                        event.stopPropagation()
                        openUserDetails(user.id)
                      }}
                    >
                      {t('admin.actions')}
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filteredRows.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {rows.length === 0 ? 'Sem utilizadores registados.' : t('admin.noUsersFound')}
          </p>
        )}
      </div>

      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          loadingKey={loadingMap[selectedUser.id] ?? null}
          error={errorMap[selectedUser.id] ?? null}
          onClose={() => setSelectedUserId(null)}
          onApprove={handleApprove}
          onUnapprove={handleUnapprove}
          onUpdateDisplayName={handleUpdateDisplayName}
          onRoleToggle={handleRoleToggle}
          onLinkPlayer={handleLinkPlayer}
          onUnlinkPlayer={handleUnlinkPlayer}
          onUpdatePlayer={handleUpdatePlayer}
          onAddAlias={handleAddAlias}
          onRemoveAlias={handleRemoveAlias}
          onPhotoUpload={handlePhotoUpload}
          onPhotoDelete={handlePhotoDelete}
        />
      )}
    </div>
  )
}

type UserDetailsModalProps = {
  user: UserRow
  loadingKey: string | null
  error: string | null
  onClose: () => void
  onApprove: (userId: string) => Promise<void>
  onUnapprove: (userId: string) => Promise<void>
  onUpdateDisplayName: (userId: string, displayName: string) => Promise<boolean>
  onRoleToggle: (userId: string, role: 'mod' | 'admin' | 'player', hasRole: boolean) => Promise<void>
  onLinkPlayer: (userId: string, player: SearchResult) => Promise<boolean>
  onUnlinkPlayer: (userId: string, playerId: string) => Promise<boolean>
  onUpdatePlayer: (
    userId: string,
    playerId: string,
    loadingKey: string,
    body: object,
    patch: Partial<NonNullable<UserRow['player']>>
  ) => Promise<boolean>
  onAddAlias: (userId: string, playerId: string, aliasDisplay: string) => Promise<boolean>
  onRemoveAlias: (userId: string, playerId: string, aliasId: string) => Promise<boolean>
  onPhotoUpload: (userId: string, playerId: string, file: File | null) => Promise<boolean>
  onPhotoDelete: (userId: string, playerId: string) => Promise<boolean>
}

function UserDetailsModal({
  user,
  loadingKey,
  error,
  onClose,
  onApprove,
  onUnapprove,
  onUpdateDisplayName,
  onRoleToggle,
  onLinkPlayer,
  onUnlinkPlayer,
  onUpdatePlayer,
  onAddAlias,
  onRemoveAlias,
  onPhotoUpload,
  onPhotoDelete,
}: UserDetailsModalProps) {
  const { t } = useTranslation()
  const player = user.player
  const hasPlayer = user.roles.includes('player')
  const hasMod = user.roles.includes('mod')
  const hasAdmin = user.roles.includes('admin')
  const isLoading = loadingKey != null
  const photoInputRef = useRef<HTMLInputElement | null>(null)
  const playerSearchAbort = useRef<AbortController | null>(null)

  const [displayName, setDisplayName] = useState(user.display_name)
  const [sheetName, setSheetName] = useState(player?.sheet_name ?? '')
  const [shirtNumber, setShirtNumber] = useState(player?.shirt_number?.toString() ?? '')
  const [rating, setRating] = useState(player?.current_rating?.toString() ?? '')
  const [positions, setPositions] = useState<string[]>(player?.preferred_positions ?? [])
  const [aliasInput, setAliasInput] = useState('')
  const [playerSearchQuery, setPlayerSearchQuery] = useState('')
  const [playerSearchResults, setPlayerSearchResults] = useState<SearchResult[]>([])
  const [feedbackGameId, setFeedbackGameId] = useState(player?.feedback_games[0]?.id ?? '')
  const [feedbackRating, setFeedbackRating] = useState('')
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<UserDetailTab>('account')

  useEffect(() => {
    setDisplayName(user.display_name)
    setSheetName(player?.sheet_name ?? '')
    setShirtNumber(player?.shirt_number?.toString() ?? '')
    setRating(player?.current_rating?.toString() ?? '')
    setPositions(player?.preferred_positions ?? [])
    setAliasInput('')
    setPlayerSearchQuery('')
    setPlayerSearchResults([])
    setFeedbackGameId(player?.feedback_games[0]?.id ?? '')
    setFeedbackRating('')
    setFeedbackText('')
    setFeedbackSubmitted(false)
    setFeedbackError(null)
  }, [player, user.display_name])

  async function searchPlayers(q: string) {
    setPlayerSearchQuery(q)
    if (!q.trim()) {
      setPlayerSearchResults([])
      return
    }
    playerSearchAbort.current?.abort()
    const controller = new AbortController()
    playerSearchAbort.current = controller
    try {
      const res = await fetch(`/api/players?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      })
      if (res.ok) setPlayerSearchResults(await res.json())
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setPlayerSearchResults([])
    }
  }

  async function saveDisplayName() {
    const ok = await onUpdateDisplayName(user.id, displayName)
    if (ok) setDisplayName(displayName.trim())
  }

  async function savePlayerDetails() {
    if (!player) return

    const trimmedName = sheetName.trim()
    const parsedShirtNumber = shirtNumber.trim() === '' ? null : parseInt(shirtNumber, 10)
    const ratingText = rating.trim()
    const parsedRating = ratingText === '' ? null : parseFloat(ratingText)

    if (!trimmedName) return
    if (parsedShirtNumber != null && (isNaN(parsedShirtNumber) || parsedShirtNumber < 1 || parsedShirtNumber > 99)) return
    if (parsedRating != null && (isNaN(parsedRating) || parsedRating < 0 || parsedRating > 10)) return

    const body: {
      sheet_name: string
      shirt_number: number | null
      preferred_positions: string[]
      current_rating?: number
    } = {
      sheet_name: trimmedName,
      shirt_number: parsedShirtNumber,
      preferred_positions: positions,
    }
    const patch: Partial<NonNullable<UserRow['player']>> = {
      sheet_name: trimmedName,
      shirt_number: parsedShirtNumber,
      preferred_positions: positions,
    }

    if (parsedRating != null) {
      body.current_rating = parsedRating
      patch.current_rating = parsedRating
    }

    await onUpdatePlayer(user.id, player.id, 'player-details', body, patch)
  }

  async function addAlias() {
    if (!player) return
    const ok = await onAddAlias(user.id, player.id, aliasInput)
    if (ok) setAliasInput('')
  }

  async function linkPlayer(result: SearchResult) {
    const ok = await onLinkPlayer(user.id, result)
    if (ok) {
      setPlayerSearchQuery('')
      setPlayerSearchResults([])
    }
  }

  async function submitFeedback(e: FormEvent) {
    e.preventDefault()
    if (!player) return

    const parsedRating = parseFloat(feedbackRating)
    if (!feedbackGameId || isNaN(parsedRating) || parsedRating < 0 || parsedRating > 10) {
      setFeedbackError(t('admin.errors.feedbackFailed'))
      return
    }

    setFeedbackSubmitting(true)
    setFeedbackError(null)
    try {
      const res = await fetch(`/api/admin/players/${player.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: feedbackGameId,
          rating: parsedRating,
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
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-user-details-title"
        className="flex h-[100dvh] w-full flex-col overflow-hidden border-0 border-border bg-background shadow-xl sm:h-auto sm:max-h-[92vh] sm:max-w-3xl sm:rounded-xl sm:border"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
          <div className="min-w-0 space-y-1">
            <h2 id="admin-user-details-title" className="truncate text-base font-bold text-fcda-navy sm:text-lg">
              {t('admin.playerDetails')}
            </h2>
            <p className="truncate text-sm text-muted-foreground">{user.display_name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={t('common.cancel')}
          >
            <X size={18} />
          </button>
        </div>

        <div className="shrink-0 overflow-x-auto border-b border-border px-4 pt-2 sm:px-5 sm:pt-3">
          <div className="flex min-w-max gap-4 text-sm">
            {USER_DETAIL_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={
                  activeTab === tab
                    ? 'border-b-2 border-fcda-navy pb-3 font-semibold text-fcda-navy'
                    : 'border-b-2 border-transparent pb-3 text-muted-foreground hover:text-foreground'
                }
              >
                {t(`admin.tabs.${tab}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-4 sm:max-h-[68vh] sm:px-5">
          {activeTab === 'account' && (
            <section className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-foreground">{t('admin.displayName')}</span>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={isLoading}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-foreground">{t('admin.email')}</span>
                  <Input value={user.email ?? t('admin.noEmail')} readOnly disabled />
                </label>
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  onClick={saveDisplayName}
                  disabled={isLoading || !displayName.trim() || displayName.trim() === user.display_name}
                >
                  {loadingKey === 'display-name' ? '...' : t('admin.saveEdit')}
                </Button>
              </div>

              <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">{t('admin.accountStatus')}</p>
                  <Badge
                    variant={user.approved ? 'default' : 'secondary'}
                    className={user.approved ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}
                  >
                    {user.approved ? t('admin.approved') : t('admin.pending')}
                  </Badge>
                </div>
                <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
                  {!user.approved ? (
                    <Button
                      size="sm"
                      className="w-full bg-green-600 text-white hover:bg-green-700 sm:w-auto"
                      onClick={() => onApprove(user.id)}
                      disabled={isLoading}
                    >
                      {loadingKey === 'approve' ? '...' : t('admin.approve')}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 sm:w-auto"
                      onClick={() => onUnapprove(user.id)}
                      disabled={isLoading}
                    >
                      {loadingKey === 'unapprove' ? '...' : t('admin.unapprove')}
                    </Button>
                  )}
                </div>
              </div>

              {user.approved && (
                <div className="flex flex-wrap gap-2">
                  {(['player', 'mod', 'admin'] as const).map((role) => {
                    const hasRole = role === 'player' ? hasPlayer : role === 'mod' ? hasMod : hasAdmin
                    return (
                      <Button
                        key={role}
                        size="sm"
                        variant={hasRole ? 'secondary' : 'outline'}
                        className="flex-1 sm:flex-none"
                        onClick={() => onRoleToggle(user.id, role, hasRole)}
                        disabled={isLoading}
                      >
                        {loadingKey === role ? '...' : hasRole ? `-${role}` : `+${role}`}
                      </Button>
                    )
                  })}
                </div>
              )}
            </section>
          )}

          {activeTab === 'player' && (
          <section className="space-y-4">
            {player ? (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <PlayerIdentity
                    name={player.sheet_name}
                    shirtNumber={player.shirt_number}
                    avatarUrl={player.avatar_url}
                    avatarSize="lg"
                    nameClassName="font-semibold text-fcda-navy"
                  />
                  <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={async (e) => {
                        await onPhotoUpload(user.id, player.id, e.target.files?.[0] ?? null)
                        e.currentTarget.value = ''
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={isLoading}
                      title={player.avatar_url ? 'Substituir foto' : 'Adicionar foto'}
                    >
                      <Camera data-icon="inline-start" />
                      {loadingKey === 'photo-upload' ? '...' : player.avatar_url ? 'Substituir foto' : 'Adicionar foto'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full text-muted-foreground sm:w-auto"
                      onClick={() => onPhotoDelete(user.id, player.id)}
                      disabled={isLoading || player.avatar_url == null}
                      title="Remover foto"
                    >
                      <Trash2 data-icon="inline-start" />
                      {loadingKey === 'photo-delete' ? '...' : 'Remover foto'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full text-muted-foreground sm:w-auto"
                      onClick={() => onUnlinkPlayer(user.id, player.id)}
                      disabled={isLoading}
                    >
                      {loadingKey === 'unlink' ? '...' : t('admin.unlinkPlayer')}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_8rem]">
                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-foreground">Nome de jogador</span>
                    <Input
                      value={sheetName}
                      onChange={(e) => setSheetName(e.target.value)}
                      disabled={isLoading}
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-foreground">Número</span>
                    <Input
                      type="number"
                      min="1"
                      max="99"
                      value={shirtNumber}
                      onChange={(e) => setShirtNumber(e.target.value)}
                      disabled={isLoading}
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-foreground">Rating</span>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      step="0.01"
                      value={rating}
                      onChange={(e) => setRating(e.target.value)}
                      disabled={isLoading}
                    />
                  </label>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Posições</p>
                  <div className="flex flex-wrap gap-2">
                    {POSITIONS.map((position) => {
                      const selected = positions.includes(position)
                      return (
                        <button
                          key={position}
                          type="button"
                          onClick={() =>
                            setPositions((prev) =>
                              selected ? prev.filter((value) => value !== position) : [...prev, position]
                            )
                          }
                          disabled={isLoading}
                          className={`rounded px-2.5 py-1 text-sm border transition-colors disabled:opacity-50 ${
                            selected
                              ? 'bg-fcda-navy text-white border-fcda-navy'
                              : 'bg-background text-fcda-navy border-fcda-navy/40 hover:border-fcda-navy'
                          }`}
                        >
                          {position}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    className="w-full sm:w-auto"
                    onClick={savePlayerDetails}
                    disabled={isLoading || !sheetName.trim()}
                  >
                    <Save data-icon="inline-start" />
                    {loadingKey === 'player-details' ? '...' : t('admin.saveEdit')}
                  </Button>
                </div>

                <div className="space-y-2 border-t border-border pt-5">
                  <p className="text-sm font-medium text-foreground">Aliases</p>
                  {player.aliases.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {player.aliases.map((alias) => (
                        <span
                          key={alias.id}
                          className="inline-flex items-center gap-1 rounded-full border bg-fcda-ice border-fcda-navy/20 px-2.5 py-0.5 text-xs text-fcda-navy"
                        >
                          {alias.alias_display}
                          <button
                            type="button"
                            aria-label={`Remove alias ${alias.alias_display}`}
                            className="text-fcda-navy/50 hover:text-destructive"
                            onClick={() => onRemoveAlias(user.id, player.id, alias.id)}
                            disabled={loadingKey === `alias-${alias.id}`}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="grid gap-2 sm:flex">
                    <Input
                      value={aliasInput}
                      onChange={(e) => setAliasInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addAlias()
                      }}
                      placeholder={t('admin.addAlias')}
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={addAlias}
                      disabled={isLoading || !aliasInput.trim()}
                    >
                      {loadingKey === 'alias' ? '...' : t('admin.addAlias')}
                    </Button>
                  </div>
                </div>

              </>
            ) : (
              <div className="space-y-3">
                <p className="rounded-lg border px-4 py-6 text-center text-sm text-muted-foreground">
                  {t('admin.noLinkedPlayer')}
                </p>
                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-foreground">{t('admin.linkPlayer')}</span>
                  <Input
                    type="search"
                    value={playerSearchQuery}
                    onChange={(e) => searchPlayers(e.target.value)}
                    placeholder={t('admin.searchPlayer')}
                    disabled={isLoading}
                  />
                </label>
                {playerSearchResults.length > 0 && (
                  <ul className="max-h-52 overflow-y-auto rounded-lg border border-input bg-background text-sm divide-y">
                    {playerSearchResults.map((result) => (
                      <li key={result.id}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-muted"
                          onClick={() => linkPlayer(result)}
                          disabled={isLoading}
                        >
                          <PlayerIdentity
                            name={result.sheet_name}
                            shirtNumber={result.shirt_number}
                            avatarUrl={result.avatar_url}
                            avatarSize="sm"
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
          )}

          {activeTab === 'feedback' && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-4 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">{t('admin.addPlayerFeedback')}</p>
              </div>
              {!player ? (
                <p className="rounded-lg border px-4 py-6 text-center text-sm text-muted-foreground">
                  {t('admin.noLinkedPlayer')}
                </p>
              ) : feedbackSubmitted ? (
                <p className="text-sm text-muted-foreground">{t('admin.playerFeedbackSubmitted')}</p>
              ) : player.feedback_games.length === 0 ? (
                <p className="rounded-lg border px-4 py-6 text-center text-sm text-muted-foreground">
                  {t('admin.noFeedbackGames')}
                </p>
              ) : (
                <form onSubmit={submitFeedback} className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
                    <label className="space-y-1.5">
                      <span className="text-sm font-medium text-foreground">{t('admin.feedbackGame')}</span>
                      <select
                        value={feedbackGameId}
                        onChange={(e) => setFeedbackGameId(e.target.value)}
                        disabled={feedbackSubmitting}
                        className="h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                      >
                        {player.feedback_games.map((game) => (
                          <option key={game.id} value={game.id}>
                            {formatGameOption(game)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-sm font-medium text-foreground">Nota (0-10)</span>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        step="0.01"
                        value={feedbackRating}
                        onChange={(e) => setFeedbackRating(e.target.value)}
                        disabled={feedbackSubmitting}
                      />
                    </label>
                  </div>
                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-foreground">{t('admin.feedbackComment')}</span>
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Comentário (opcional)"
                      disabled={feedbackSubmitting}
                      maxLength={300}
                      rows={3}
                      className="w-full resize-none rounded-lg border border-input bg-background px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-40"
                    />
                  </label>
                  {feedbackError && <p role="alert" className="text-sm text-destructive">{feedbackError}</p>}
                  <div className="flex justify-end">
                    <Button className="w-full sm:w-auto" type="submit" disabled={feedbackSubmitting}>
                      {feedbackSubmitting ? t('matches.ratingSubmitting') : t('matches.ratingSubmit')}
                    </Button>
                  </div>
                </form>
              )}
            </section>
          )}

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="shrink-0 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex sm:justify-end sm:px-5 sm:py-4">
          <Button className="w-full sm:w-auto" type="button" variant="outline" onClick={onClose}>
            {t('admin.closeItem')}
          </Button>
        </div>
      </div>
    </div>
  )
}
