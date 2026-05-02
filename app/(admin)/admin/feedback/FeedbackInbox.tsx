'use client'

import type { FeedbackItem } from './page'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Pencil, Search, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PlayerIdentity } from '@/components/player/PlayerIdentity'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Props = {
  items: FeedbackItem[]
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase()
}

function formatMatchDate(dateValue: string) {
  if (!dateValue) return null
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return null

  const datePart = new Intl.DateTimeFormat('pt-PT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Lisbon',
  }).format(date)
  const timePart = new Intl.DateTimeFormat('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Europe/Lisbon',
  }).format(date)
  return `${datePart.charAt(0).toLocaleUpperCase('pt-PT')}${datePart.slice(1)} · ${timePart}`
}

export function FeedbackInbox({ items: initialItems }: Props) {
  const { t } = useTranslation()
  const [items, setItems] = useState(initialItems)
  const [playerQuery, setPlayerQuery] = useState('')
  const [reporterQuery, setReporterQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const filteredItems = useMemo(() => {
    const playerNeedle = playerQuery.trim().toLocaleLowerCase()
    const reporterNeedle = reporterQuery.trim().toLocaleLowerCase()

    return items
      .filter((item) => item.submitterName.toLocaleLowerCase().includes(reporterNeedle))
      .map((item) => ({
        ...item,
        comments: item.comments.filter((comment) =>
          comment.playerName.toLocaleLowerCase().includes(playerNeedle)
        ),
      }))
      .filter((item) => item.comments.length > 0)
  }, [items, playerQuery, reporterQuery])

  function startEdit(commentId: string, content: string) {
    setEditingId(commentId)
    setEditValue(content)
    setError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditValue('')
    setError(null)
  }

  function updateComment(commentId: string, content: string | null) {
    setItems((prev) =>
      prev
        .map((item) => ({
          ...item,
          comments: content === null
            ? item.comments.filter((comment) => comment.id !== commentId)
            : item.comments.map((comment) =>
                comment.id === commentId ? { ...comment, content } : comment
              ),
        }))
        .filter((item) => item.comments.length > 0)
    )
  }

  async function saveEdit(commentId: string) {
    const feedback = editValue.trim()
    if (!feedback) {
      await removeFeedback(commentId, false)
      return
    }

    setLoadingId(commentId)
    setError(null)

    const res = await fetch(`/api/admin/feedback/${commentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback }),
    })

    setLoadingId(null)
    if (res.ok) {
      updateComment(commentId, feedback)
      cancelEdit()
    } else {
      setError(t('admin.errors.feedbackFailed'))
    }
  }

  async function removeFeedback(commentId: string, shouldConfirm = true) {
    if (shouldConfirm && !window.confirm(t('admin.removeFeedbackConfirm'))) return

    setLoadingId(commentId)
    setError(null)

    const res = await fetch(`/api/admin/feedback/${commentId}`, {
      method: 'DELETE',
    })

    setLoadingId(null)
    if (res.ok) {
      updateComment(commentId, null)
      if (editingId === commentId) cancelEdit()
    } else {
      setError(t('admin.errors.feedbackFailed'))
    }
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">{t('admin.noFeedbackComments')}</p>
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium text-foreground">
          {t('admin.searchFeedbackPlayer')}
          <span className="relative block">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={playerQuery}
              onChange={(e) => setPlayerQuery(e.target.value)}
              placeholder={t('admin.searchFeedbackPlayerPlaceholder')}
              className="bg-background pl-8 text-foreground placeholder:text-muted-foreground"
            />
          </span>
        </label>
        <label className="space-y-1 text-sm font-medium text-foreground">
          {t('admin.searchFeedbackReporter')}
          <span className="relative block">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={reporterQuery}
              onChange={(e) => setReporterQuery(e.target.value)}
              placeholder={t('admin.searchFeedbackReporterPlaceholder')}
              className="bg-background pl-8 text-foreground placeholder:text-muted-foreground"
            />
          </span>
        </label>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {filteredItems.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">{t('admin.noFeedbackFound')}</p>
      ) : filteredItems.map((item) => (
        <div key={item.groupId} className="rounded-lg border border-border bg-card p-3 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <Link
              href={`/matches/${item.gameId}`}
              className="group min-w-0 text-sm"
            >
              <p className="font-medium text-foreground group-hover:underline">
                {formatMatchDate(item.gameDate) ?? t('admin.feedbackGame')}
              </p>
              {item.gameLocation && (
                <p className="mt-1 text-muted-foreground group-hover:underline">
                  {item.gameLocation}
                </p>
              )}
            </Link>
            <div className="flex min-w-0 shrink-0 items-center gap-2 text-right">
              <div className="hidden min-w-0 sm:block">
                <span className="block text-[11px] font-medium uppercase tracking-normal text-muted-foreground">
                  {t('admin.feedbackReporter')}
                </span>
                <span className="block max-w-40 truncate text-sm font-medium text-foreground">
                  {item.submitterName}
                </span>
              </div>
              <Avatar className="shrink-0" title={item.submitterName}>
                {item.submitterAvatarUrl ? (
                  <AvatarImage src={item.submitterAvatarUrl} alt={item.submitterName} />
                ) : null}
                <AvatarFallback className="bg-fcda-gold text-fcda-navy font-semibold">
                  {getInitials(item.submitterName)}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
          <ul>
            {item.comments.map((c) => (
              <li key={c.id} className="border-t border-border/70 py-3 first:border-t-0 first:pt-0 last:pb-0 text-sm">
                {editingId === c.id ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-medium uppercase tracking-normal text-muted-foreground">
                        {t('admin.feedbackEvaluatedPlayer')}
                      </span>
                      <PlayerIdentity
                        name={c.playerName}
                        avatarUrl={c.playerAvatarUrl}
                        nationality={c.playerNationality}
                        avatarSize="sm"
                        nameClassName="font-medium"
                      />
                    </div>
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      rows={3}
                      maxLength={300}
                      disabled={loadingId === c.id}
                      className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => saveEdit(c.id)} disabled={loadingId === c.id}>
                        {loadingId === c.id ? '...' : t('admin.saveEdit')}
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit} disabled={loadingId === c.id}>
                        {t('admin.cancelEdit')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-[11px] font-medium uppercase tracking-normal text-muted-foreground">
                          {t('admin.feedbackEvaluatedPlayer')}
                        </span>
                        <PlayerIdentity
                          name={c.playerName}
                          avatarUrl={c.playerAvatarUrl}
                          nationality={c.playerNationality}
                          avatarSize="sm"
                          nameClassName="font-medium"
                        />
                        <span className="text-muted-foreground">&ldquo;{c.content}&rdquo;</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="icon-sm"
                        variant="outline"
                        onClick={() => startEdit(c.id, c.content)}
                        disabled={loadingId === c.id}
                        title={t('admin.edit')}
                        aria-label={t('admin.edit')}
                      >
                        <Pencil aria-hidden="true" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="destructive"
                        onClick={() => removeFeedback(c.id)}
                        disabled={loadingId === c.id}
                        title={t('admin.removeFeedback')}
                        aria-label={t('admin.removeFeedback')}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
