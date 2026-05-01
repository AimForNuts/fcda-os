'use client'

import { useDeferredValue, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
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

function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-PT')
}

export function UserTable({ users: initial }: { users: UserRow[] }) {
  const { t } = useTranslation()
  const [rows, setRows] = useState<UserRow[]>(initial)
  const [listSearchValue, setListSearchValue] = useState('')
  const [loadingMap, setLoadingMap] = useState<Record<string, string>>({})
  const [errorMap, setErrorMap] = useState<Record<string, string>>({})
  const [linkingUserId, setLinkingUserId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const deferredListSearchValue = useDeferredValue(listSearchValue)
  const searchAbort = useRef<AbortController | null>(null)

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
    const ok = await patchUser(userId, 'unapprove', { approved: false })
    if (ok) {
      setRows((prev) =>
        prev.map((r) => (r.id === userId ? { ...r, approved: false, roles: [] } : r))
      )
    }
  }

  async function handleRoleToggle(userId: string, role: 'mod' | 'admin' | 'player', hasRole: boolean) {
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

  async function handleSearchPlayers(q: string) {
    setSearchQuery(q)
    if (!q.trim()) {
      setSearchResults([])
      return
    }
    searchAbort.current?.abort()
    const controller = new AbortController()
    searchAbort.current = controller
    try {
      const res = await fetch(`/api/players?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      })
      if (res.ok) setSearchResults(await res.json())
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setSearchResults([])
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
                  avatar_url: player.avatar_url,
                  aliases: [],
                },
              }
            : r
        )
      )
      setLinkingUserId(null)
      setSearchQuery('')
      setSearchResults([])
    }
  }

  async function handleUnlinkPlayer(userId: string, playerId: string) {
    const ok = await patchPlayer(playerId, userId, 'unlink', { profile_id: null })
    if (ok) {
      setRows((prev) => prev.map((r) => (r.id === userId ? { ...r, player: null } : r)))
    }
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
              <th className="px-4 py-3 text-left font-medium">Estado</th>
              <th className="px-4 py-3 text-left font-medium">Papéis</th>
              <th className="px-4 py-3 text-left font-medium">Jogador / Aliases</th>
              <th className="px-4 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredRows.map((user) => {
            const isLoading = !!loadingMap[user.id]
            const error = errorMap[user.id]
            const hasPlayer = user.roles.includes('player')
            const hasMod = user.roles.includes('mod')
            const hasAdmin = user.roles.includes('admin')
            const isLinking = linkingUserId === user.id

            return (
              <tr key={user.id} className="bg-background hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">{user.display_name}</td>

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

                  {isLinking && (
                    <div className="mt-2 space-y-1">
                      <input
                        type="text"
                        placeholder={t('admin.searchPlayer')}
                        className="w-full rounded border border-input bg-background px-2 py-1 text-sm"
                        value={searchQuery}
                        onChange={(e) => handleSearchPlayers(e.target.value)}
                        autoFocus
                      />
                      {searchResults.length > 0 && (
                        <ul className="rounded border border-input bg-background text-sm divide-y max-h-32 overflow-y-auto">
                          {searchResults.map((p) => (
                            <li key={p.id}>
                              <button
                                type="button"
                                className="w-full px-2 py-1.5 text-left hover:bg-muted"
                                onClick={() => handleLinkPlayer(user.id, p)}
                              >
                                <PlayerIdentity
                                  name={p.sheet_name}
                                  shirtNumber={p.shirt_number}
                                  avatarUrl={p.avatar_url}
                                  avatarSize="sm"
                                />
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
                          setLinkingUserId(null)
                          setSearchQuery('')
                          setSearchResults([])
                        }}
                      >
                        {t('admin.cancelEdit')}
                      </Button>
                    </div>
                  )}

                  {error && (
                    <p role="alert" className="text-xs text-destructive mt-1">{error}</p>
                  )}
                </td>

                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1 justify-end">
                    {!user.approved ? (
                      <Button
                        size="sm"
                        className="bg-green-600 text-white hover:bg-green-700 text-xs"
                        onClick={() => handleApprove(user.id)}
                        disabled={isLoading}
                      >
                        {loadingMap[user.id] === 'approve' ? '...' : t('admin.approve')}
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => handleRoleToggle(user.id, 'player', hasPlayer)}
                          disabled={isLoading}
                        >
                          {loadingMap[user.id] === 'player' ? '...' : hasPlayer ? '−Player' : '+Player'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => handleRoleToggle(user.id, 'mod', hasMod)}
                          disabled={isLoading}
                        >
                          {loadingMap[user.id] === 'mod' ? '...' : hasMod ? '−Mod' : '+Mod'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => handleRoleToggle(user.id, 'admin', hasAdmin)}
                          disabled={isLoading}
                        >
                          {loadingMap[user.id] === 'admin' ? '...' : hasAdmin ? '−Admin' : '+Admin'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs"
                          onClick={() => handleUnapprove(user.id)}
                          disabled={isLoading}
                        >
                          {loadingMap[user.id] === 'unapprove' ? '...' : t('admin.unapprove')}
                        </Button>
                        {!isLinking && (
                          user.player ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs text-muted-foreground"
                              onClick={() => handleUnlinkPlayer(user.id, user.player!.id)}
                              disabled={isLoading}
                            >
                              {loadingMap[user.id] === 'unlink' ? '...' : t('admin.unlinkPlayer')}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => {
                                setLinkingUserId(user.id)
                                setSearchQuery('')
                                setSearchResults([])
                              }}
                              disabled={isLoading}
                            >
                              {t('admin.linkPlayer')}
                            </Button>
                          )
                        )}
                      </>
                    )}
                  </div>
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
    </div>
  )
}
