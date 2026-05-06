"use client"

import { useState, useTransition } from 'react'
import { Pencil, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

type PlayerDescriptionEditorProps = {
  playerId: string
  initialDescription: string | null
  fallbackDescription: string
  canEdit: boolean
}

export function PlayerDescriptionEditor({
  playerId,
  initialDescription,
  fallbackDescription,
  canEdit,
}: PlayerDescriptionEditorProps) {
  const [description, setDescription] = useState(initialDescription)
  const [draft, setDraft] = useState(initialDescription ?? '')
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const visibleDescription = description || fallbackDescription

  function cancel() {
    setDraft(description ?? '')
    setError(null)
    setIsEditing(false)
  }

  function save() {
    setError(null)
    startTransition(async () => {
      const nextDescription = draft.trim() || null
      const response = await fetch(`/api/players/${playerId}/description`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: nextDescription }),
      })

      if (!response.ok) {
        setError('Não foi possível guardar a descrição.')
        return
      }

      const payload = await response.json() as { description: string | null }
      setDescription(payload.description)
      setDraft(payload.description ?? '')
      setIsEditing(false)
    })
  }

  if (isEditing) {
    return (
      <div className="space-y-3">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={1600}
          rows={8}
          className="min-h-48 w-full resize-y border border-input bg-background p-4 text-base leading-7 text-foreground outline-none transition-colors focus:border-fcda-gold focus:ring-3 focus:ring-fcda-gold/20"
          placeholder="Escreve a biografia do jogador..."
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={save} disabled={isPending}>
            <Save className="size-4" />
            {isPending ? 'A guardar...' : 'Guardar'}
          </Button>
          <Button type="button" variant="outline" onClick={cancel} disabled={isPending}>
            <X className="size-4" />
            Cancelar
          </Button>
          <span className="text-xs text-muted-foreground">{draft.length}/1600</span>
        </div>
        {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="whitespace-pre-wrap text-base leading-7 text-foreground/90">
        {visibleDescription}
      </div>
      {canEdit && (
        <Button type="button" variant="outline" onClick={() => setIsEditing(true)}>
          <Pencil className="size-4" />
          {description ? 'Editar biografia' : 'Adicionar biografia'}
        </Button>
      )}
    </div>
  )
}
