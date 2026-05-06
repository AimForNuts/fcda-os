'use client'

import type { FeedbackItem } from './page'
import Link from 'next/link'
import { Combobox } from '@base-ui/react/combobox'
import { Check, ChevronDown, Pencil, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PlayerIdentity } from '@/components/player/PlayerIdentity'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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

type FeedbackFilterComboboxProps = {
  id: string
  label: string
  placeholder: string
  optionValues: string[]
  value: string[]
  onValueChange: (next: string[]) => void
  listItemContent: (value: string) => ReactNode
  chipContent: (value: string) => ReactNode
  removeChipAriaLabel: (value: string) => string
}

function FeedbackFilterCombobox({
  id,
  label,
  placeholder,
  optionValues,
  value,
  onValueChange,
  listItemContent,
  chipContent,
  removeChipAriaLabel,
}: FeedbackFilterComboboxProps) {
  const items = useMemo(() => optionValues, [optionValues])

  return (
    <Combobox.Root
      multiple
      items={items}
      value={value}
      onValueChange={(v) => {
        if (Array.isArray(v)) onValueChange(v)
        else onValueChange([])
      }}
      itemToStringLabel={(v: string) => v}
      locale="pt-PT"
    >
      <div className="space-y-1">
        <Combobox.Label className="text-sm font-medium text-foreground">{label}</Combobox.Label>
        <Combobox.InputGroup
          className={cn(
            'flex min-h-8 w-full min-w-0 flex-wrap items-center gap-x-1 gap-y-1 rounded-lg border border-input bg-background px-1 py-1 pr-0.5 transition-colors',
            'data-[open]:border-ring data-[open]:ring-3 data-[open]:ring-ring/50',
            'focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50'
          )}
        >
          <Combobox.Chips className="flex min-w-0 flex-wrap content-center items-center gap-1">
            <Combobox.Value>
              {(selected: string[]) =>
                selected.map((item) => (
                  <Combobox.Chip
                    key={item}
                    className="flex max-w-[min(100%,14rem)] items-center gap-0.5 rounded-md border border-border bg-muted/80 py-0.5 pr-0.5 pl-1.5 text-xs text-foreground"
                  >
                    <span className="min-w-0 flex-1">{chipContent(item)}</span>
                    <Combobox.ChipRemove
                      type="button"
                      aria-label={removeChipAriaLabel(item)}
                      className="rounded p-0.5 text-muted-foreground hover:bg-background/80 hover:text-foreground"
                    />
                  </Combobox.Chip>
                ))
              }
            </Combobox.Value>
          </Combobox.Chips>
          <Combobox.Input
            id={id}
            placeholder={placeholder}
            className={cn(
              'min-w-[6rem] flex-1 border-0 bg-transparent px-1.5 py-0.5 text-sm text-foreground outline-none',
              'placeholder:text-muted-foreground',
              'focus-visible:ring-0'
            )}
          />
          <Combobox.Trigger
            type="button"
            aria-label={label}
            className={cn(
              'flex size-8 shrink-0 cursor-default items-center justify-center rounded-md text-muted-foreground',
              'outline-none hover:text-foreground focus-visible:bg-accent'
            )}
          >
            <ChevronDown className="size-4" aria-hidden="true" />
          </Combobox.Trigger>
        </Combobox.InputGroup>
      </div>

      <Combobox.Portal>
        <Combobox.Positioner
          side="bottom"
          align="start"
          sideOffset={4}
          className="isolate z-50 outline-none"
        >
          <Combobox.Popup
            className={cn(
              'w-(--anchor-width) max-h-60 overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md',
              'ring-1 ring-foreground/10 outline-none',
              'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
              'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95'
            )}
          >
            <Combobox.List className="outline-none">
              {(item: string) => (
                <Combobox.Item
                  key={item}
                  value={item}
                  className={cn(
                    'grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground outline-none select-none',
                    'data-highlighted:bg-accent data-highlighted:text-accent-foreground'
                  )}
                >
                  <span className="flex size-4 shrink-0 items-center justify-center">
                    <Combobox.ItemIndicator>
                      <Check className="size-3.5 text-primary" aria-hidden />
                    </Combobox.ItemIndicator>
                  </span>
                  <span className="min-w-0">{listItemContent(item)}</span>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}

export function FeedbackInbox({ items: initialItems }: Props) {
  const { t } = useTranslation()
  const [items, setItems] = useState(initialItems)
  const [playerFilter, setPlayerFilter] = useState<string[]>([])
  const [reporterFilter, setReporterFilter] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const playerNames = useMemo(() => {
    const s = new Set<string>()
    for (const item of items) {
      for (const c of item.comments) s.add(c.playerName)
    }
    return [...s].sort((a, b) => a.localeCompare(b, 'pt-PT'))
  }, [items])

  const playerMetaByName = useMemo(() => {
    const m = new Map<string, { avatarUrl: string | null; nationality: string }>()
    for (const item of items) {
      for (const c of item.comments) {
        if (!m.has(c.playerName)) {
          m.set(c.playerName, {
            avatarUrl: c.playerAvatarUrl,
            nationality: c.playerNationality,
          })
        }
      }
    }
    return m
  }, [items])

  const reporterNames = useMemo(() => {
    const s = new Set<string>()
    for (const item of items) {
      s.add(item.submitterName)
    }
    return [...s].sort((a, b) => a.localeCompare(b, 'pt-PT'))
  }, [items])

  const reporterMetaByName = useMemo(() => {
    const m = new Map<string, { avatarUrl: string | null }>()
    for (const item of items) {
      if (!m.has(item.submitterName)) {
        m.set(item.submitterName, { avatarUrl: item.submitterAvatarUrl })
      }
    }
    return m
  }, [items])

  const effectivePlayerFilter = useMemo(
    () => playerFilter.filter((n) => playerNames.includes(n)),
    [playerFilter, playerNames]
  )

  const effectiveReporterFilter = useMemo(
    () => reporterFilter.filter((n) => reporterNames.includes(n)),
    [reporterFilter, reporterNames]
  )

  const filteredItems = useMemo(() => {
    return items
      .filter(
        (item) =>
          effectiveReporterFilter.length === 0 ||
          effectiveReporterFilter.includes(item.submitterName)
      )
      .map((item) => ({
        ...item,
        comments: item.comments.filter(
          (comment) =>
            effectivePlayerFilter.length === 0 ||
            effectivePlayerFilter.includes(comment.playerName)
        ),
      }))
      .filter((item) => item.comments.length > 0)
  }, [items, effectivePlayerFilter, effectiveReporterFilter])

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
          comments:
            content === null
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
        <FeedbackFilterCombobox
          id="admin-feedback-filter-player"
          label={t('admin.searchFeedbackPlayer')}
          placeholder={t('admin.searchFeedbackPlayerPlaceholder')}
          optionValues={playerNames}
          value={effectivePlayerFilter}
          onValueChange={setPlayerFilter}
          removeChipAriaLabel={(name) => t('admin.feedbackFilterRemoveChip', { name })}
          listItemContent={(v) => (
            <PlayerIdentity
              name={v}
              avatarUrl={playerMetaByName.get(v)?.avatarUrl ?? null}
              nationality={playerMetaByName.get(v)?.nationality ?? 'PT'}
              avatarSize="sm"
              nameClassName="font-normal"
            />
          )}
          chipContent={(v) => {
            const meta = playerMetaByName.get(v)
            return (
              <span className="flex min-w-0 items-center gap-1">
                <Avatar size="sm" className="shrink-0">
                  {meta?.avatarUrl ? <AvatarImage src={meta.avatarUrl} alt="" /> : null}
                  <AvatarFallback className="bg-fcda-gold text-fcda-navy text-[10px] font-semibold">
                    {getInitials(v)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate font-medium">{v}</span>
              </span>
            )
          }}
        />
        <FeedbackFilterCombobox
          id="admin-feedback-filter-reporter"
          label={t('admin.searchFeedbackReporter')}
          placeholder={t('admin.searchFeedbackReporterPlaceholder')}
          optionValues={reporterNames}
          value={effectiveReporterFilter}
          onValueChange={setReporterFilter}
          removeChipAriaLabel={(name) => t('admin.feedbackFilterRemoveChip', { name })}
          listItemContent={(v) => {
            const meta = reporterMetaByName.get(v)
            return (
              <span className="flex min-w-0 items-center gap-2">
                <Avatar size="sm" className="shrink-0">
                  {meta?.avatarUrl ? <AvatarImage src={meta.avatarUrl} alt={v} /> : null}
                  <AvatarFallback className="bg-fcda-gold text-fcda-navy font-semibold">
                    {getInitials(v)}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 truncate font-normal">{v}</span>
              </span>
            )
          }}
          chipContent={(v) => {
            const meta = reporterMetaByName.get(v)
            return (
              <span className="flex min-w-0 items-center gap-1">
                <Avatar size="sm" className="shrink-0">
                  {meta?.avatarUrl ? <AvatarImage src={meta.avatarUrl} alt="" /> : null}
                  <AvatarFallback className="bg-fcda-gold text-fcda-navy text-[10px] font-semibold">
                    {getInitials(v)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate font-medium">{v}</span>
              </span>
            )
          }}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {filteredItems.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">{t('admin.noFeedbackFound')}</p>
      ) : (
        filteredItems.map((item) => (
          <div key={item.groupId} className="rounded-lg border border-border bg-card p-3 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <Link href={`/matches/${item.gameId}`} className="group min-w-0 text-sm">
                <p className="font-medium text-foreground group-hover:underline">
                  {formatMatchDate(item.gameDate) ?? t('admin.feedbackGame')}
                </p>
                {item.gameLocation && (
                  <p className="mt-1 text-muted-foreground group-hover:underline">{item.gameLocation}</p>
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
                <li
                  key={c.id}
                  className="border-t border-border/70 py-3 first:border-t-0 first:pt-0 last:pb-0 text-sm"
                >
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
        ))
      )}
    </div>
  )
}
