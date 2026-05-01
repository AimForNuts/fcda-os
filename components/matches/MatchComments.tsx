'use client'

import { FormEvent, Fragment, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AtSign, Check, Loader2, Pencil, Send, SmilePlus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import {
  extractMentionUserIds,
  getMentionToken,
  type MentionableUser,
} from '@/lib/matches/comments'

export type MatchComment = {
  id: string
  author_id: string
  author_name: string
  author_avatar_url: string | null
  content: string
  mention_user_ids: string[]
  created_at: string
}

type Props = {
  gameId: string
  comments: MatchComment[]
  mentionableUsers: MentionableUser[]
  currentUser: (MentionableUser & { avatar_url?: string | null }) | null
}

const EMOJIS = ['⚽', '🔥', '👏', '😂', '💪', '❤️']

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase()
}

function formatCommentTime(iso: string) {
  return new Date(iso).toLocaleString('pt-PT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function useMentionQuery(content: string) {
  return useMemo(() => {
    const match = content.match(/@([^\n@]{0,40})$/)
    return match ? match[1].trim().toLocaleLowerCase('pt-PT') : null
  }, [content])
}

function renderMentionedText(text: string, users: MentionableUser[]) {
  const sortedUsers = [...users].sort((a, b) => b.display_name.length - a.display_name.length)
  const nodes: ReactNode[] = []
  let index = 0

  while (index < text.length) {
    const match = sortedUsers.find((user) => {
      const mention = getMentionToken(user)
      const segment = text.slice(index, index + mention.length)
      const nextChar = text[index + mention.length]
      const hasBoundary = !nextChar || !/[\p{L}\p{N}_-]/u.test(nextChar)

      return segment.toLocaleLowerCase('pt-PT') === mention.toLocaleLowerCase('pt-PT') && hasBoundary
    })

    if (match) {
      const mention = getMentionToken(match)
      nodes.push(
        <span
          key={`${match.id}-${index}`}
          className="rounded bg-fcda-gold/25 px-1 font-medium text-fcda-navy dark:text-fcda-gold"
        >
          {mention}
        </span>
      )
      index += mention.length
    } else {
      nodes.push(text[index])
      index += 1
    }
  }

  return nodes
}

function CommentBody({ content, users }: { content: string; users: MentionableUser[] }) {
  const lines = content.split('\n')

  return (
    <div className="space-y-1 whitespace-pre-wrap break-words text-sm leading-6">
      {lines.map((line, lineIndex) => (
        <p key={lineIndex}>
          {line.length === 0 ? (
            <br />
          ) : (
            <Fragment>{renderMentionedText(line, users)}</Fragment>
          )}
        </p>
      ))}
    </div>
  )
}

export function MatchComments({ gameId, comments, mentionableUsers, currentUser }: Props) {
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const editTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [items, setItems] = useState(comments)
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [busyCommentId, setBusyCommentId] = useState<string | null>(null)

  const mentionQuery = useMentionQuery(content)
  const mentionSuggestions = useMemo(() => {
    if (mentionQuery == null) return []
    return mentionableUsers
      .filter((user) => user.display_name.toLocaleLowerCase('pt-PT').includes(mentionQuery))
      .slice(0, 5)
  }, [mentionQuery, mentionableUsers])

  const editMentionQuery = useMentionQuery(editContent)
  const editMentionSuggestions = useMemo(() => {
    if (editMentionQuery == null) return []
    return mentionableUsers
      .filter((user) => user.display_name.toLocaleLowerCase('pt-PT').includes(editMentionQuery))
      .slice(0, 5)
  }, [editMentionQuery, mentionableUsers])

  const canSubmit = content.trim().length > 0 && !isSubmitting && currentUser != null

  function insertText(value: string) {
    const textarea = textareaRef.current
    if (!textarea) {
      setContent((previous) => `${previous}${value}`)
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const next = `${content.slice(0, start)}${value}${content.slice(end)}`
    setContent(next)
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.selectionStart = start + value.length
      textarea.selectionEnd = start + value.length
    })
  }

  function insertMention(user: MentionableUser) {
    setContent((previous) => previous.replace(/@([^\n@]{0,40})$/, `${getMentionToken(user)} `))
    textareaRef.current?.focus()
  }

  function startEdit(comment: MatchComment) {
    setEditingId(comment.id)
    setEditContent(comment.content)
    setEditError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditContent('')
    setEditError(null)
  }

  function insertEditMention(user: MentionableUser) {
    setEditContent((previous) => previous.replace(/@([^\n@]{0,40})$/, `${getMentionToken(user)} `))
    editTextareaRef.current?.focus()
  }

  function insertEditText(value: string) {
    const textarea = editTextareaRef.current
    if (!textarea) {
      setEditContent((previous) => `${previous}${value}`)
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const next = `${editContent.slice(0, start)}${value}${editContent.slice(end)}`
    setEditContent(next)
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.selectionStart = start + value.length
      textarea.selectionEnd = start + value.length
    })
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return

    setError(null)
    setIsSubmitting(true)

    try {
      const mentionUserIds = extractMentionUserIds(content, mentionableUsers)
      const res = await fetch(`/api/matches/${gameId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          mentionUserIds,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(typeof data?.error === 'string' ? data.error : 'Não foi possível publicar')
        return
      }

      setItems((previous) => [...previous, data as MatchComment])
      setContent('')
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  async function submitEdit(comment: MatchComment) {
    if (!currentUser || busyCommentId || editContent.trim().length === 0) return

    setEditError(null)
    setBusyCommentId(comment.id)

    try {
      const mentionUserIds = extractMentionUserIds(editContent, mentionableUsers)
      const res = await fetch(`/api/matches/${gameId}/comments/${comment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editContent.trim(),
          mentionUserIds,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setEditError(typeof data?.error === 'string' ? data.error : 'Não foi possível atualizar')
        return
      }

      setItems((previous) =>
        previous.map((item) =>
          item.id === comment.id
            ? {
                ...(data as MatchComment),
                author_avatar_url:
                  (data as MatchComment).author_avatar_url ?? item.author_avatar_url,
              }
            : item
        )
      )
      cancelEdit()
      router.refresh()
    } finally {
      setBusyCommentId(null)
    }
  }

  async function deleteComment(comment: MatchComment) {
    if (!currentUser || busyCommentId) return
    if (!window.confirm('Eliminar este comentário?')) return

    setBusyCommentId(comment.id)
    try {
      const res = await fetch(`/api/matches/${gameId}/comments/${comment.id}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(typeof data?.error === 'string' ? data.error : 'Não foi possível eliminar')
        return
      }

      setItems((previous) => previous.filter((item) => item.id !== comment.id))
      if (editingId === comment.id) cancelEdit()
      router.refresh()
    } finally {
      setBusyCommentId(null)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Comentários
        </h2>
        <span className="text-xs tabular-nums text-muted-foreground">{items.length}</span>
      </div>

      <div className="space-y-4">
        {items.map((comment) => {
          const isOwnComment = currentUser?.id === comment.author_id
          const isEditing = editingId === comment.id
          const isBusy = busyCommentId === comment.id

          return (
            <article key={comment.id} className="flex gap-3 border-b pb-4 last:border-b-0">
              <Avatar size="sm" className="mt-0.5">
                {comment.author_avatar_url ? (
                  <AvatarImage src={comment.author_avatar_url} alt={comment.author_name} />
                ) : null}
                <AvatarFallback className="bg-fcda-gold text-fcda-navy font-semibold">
                  {getInitials(comment.author_name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="font-medium">{comment.author_name}</span>
                    <time className="text-xs text-muted-foreground" dateTime={comment.created_at}>
                      {formatCommentTime(comment.created_at)}
                    </time>
                  </div>
                  {isOwnComment && !isEditing && (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        title="Editar comentário"
                        onClick={() => startEdit(comment)}
                        disabled={isBusy}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        title="Eliminar comentário"
                        onClick={() => deleteComment(comment)}
                        disabled={isBusy}
                      >
                        {isBusy ? <Loader2 className="animate-spin" /> : <Trash2 />}
                      </Button>
                    </div>
                  )}
                </div>
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <label htmlFor={`match-comment-edit-${comment.id}`} className="sr-only">
                        Editar comentário
                      </label>
                      <textarea
                        ref={editTextareaRef}
                        id={`match-comment-edit-${comment.id}`}
                        value={editContent}
                        onChange={(event) => setEditContent(event.target.value)}
                        maxLength={2000}
                        rows={3}
                        className="min-h-20 w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      />
                      {editMentionSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border bg-popover shadow-md">
                          {editMentionSuggestions.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => insertEditMention(user)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                            >
                              <AtSign className="size-3.5 text-muted-foreground" />
                              {user.display_name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {editError && <p role="alert" className="text-sm text-destructive">{editError}</p>}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1">
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          title="Menção"
                          onClick={() => insertEditText('@')}
                        >
                          <AtSign />
                        </Button>
                        <span className="mx-1 h-5 w-px bg-border" />
                        {EMOJIS.map((emoji) => (
                          <Button
                            key={emoji}
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`Inserir ${emoji}`}
                            onClick={() => insertEditText(emoji)}
                          >
                            <span aria-hidden>{emoji}</span>
                          </Button>
                        ))}
                        <Button type="button" size="icon-sm" variant="ghost" title="Emoji" onClick={() => insertEditText('🙂')}>
                          <SmilePlus />
                        </Button>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={cancelEdit} disabled={isBusy}>
                          <X />
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => submitEdit(comment)}
                          disabled={isBusy || editContent.trim().length === 0}
                        >
                          {isBusy ? <Loader2 className="animate-spin" /> : <Check />}
                          Guardar
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <CommentBody content={comment.content} users={mentionableUsers} />
                )}
              </div>
            </article>
          )
        })}

        {items.length === 0 && (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Sem comentários.
          </p>
        )}
      </div>

      {currentUser ? (
        <form onSubmit={submitComment} className="space-y-3 rounded-lg border bg-card p-3">
          <div className="flex gap-2">
            <Avatar size="sm" className="mt-1">
              {currentUser.avatar_url ? (
                <AvatarImage src={currentUser.avatar_url} alt={currentUser.display_name} />
              ) : null}
              <AvatarFallback className="bg-fcda-gold text-fcda-navy font-semibold">
                {getInitials(currentUser.display_name)}
              </AvatarFallback>
            </Avatar>
            <div className="relative flex-1">
              <label htmlFor="match-comment" className="sr-only">
                Comentário
              </label>
              <textarea
                ref={textareaRef}
                id="match-comment"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="Comentar..."
                className="min-h-24 w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              {mentionSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border bg-popover shadow-md">
                  {mentionSuggestions.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => insertMention(user)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <AtSign className="size-3.5 text-muted-foreground" />
                      {user.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && <p role="alert" className="ml-8 text-sm text-destructive">{error}</p>}

          <div className="ml-8 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1">
              <Button type="button" size="icon-sm" variant="ghost" title="Menção" onClick={() => insertText('@')}>
                <AtSign />
              </Button>
              <span className="mx-1 h-5 w-px bg-border" />
              {EMOJIS.map((emoji) => (
                <Button
                  key={emoji}
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Inserir ${emoji}`}
                  onClick={() => insertText(emoji)}
                >
                  <span aria-hidden>{emoji}</span>
                </Button>
              ))}
              <Button type="button" size="icon-sm" variant="ghost" title="Emoji" onClick={() => insertText('🙂')}>
                <SmilePlus />
              </Button>
            </div>
            <Button type="submit" size="sm" disabled={!canSubmit} className={cn('min-w-24', isSubmitting && 'opacity-80')}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
              Publicar
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <p className="text-sm text-muted-foreground">Inicia sessão para comentar.</p>
          <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/auth/login" />}>
            Entrar
          </Button>
        </div>
      )}
    </section>
  )
}
