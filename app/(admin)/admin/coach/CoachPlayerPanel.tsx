'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

type SubmissionRow = {
  id: string
  gameDate: string
  gameLocation: string
  submitterName: string
  rating: number
  feedback: string | null
}

type Props = {
  submissions: SubmissionRow[]
}

export function CoachPlayerPanel({ submissions }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [rows, setRows] = useState(submissions)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">Sem avaliações aprovadas.</p>
  }

  function startEdit(row: SubmissionRow) {
    setEditingId(row.id)
    setEditValue(row.feedback ?? '')
    setSaveError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditValue('')
    setSaveError(null)
  }

  async function saveEdit(id: string) {
    setSaving(true)
    setSaveError(null)
    const feedback = editValue.trim() || null
    const res = await fetch(`/api/admin/ratings/${id}/feedback`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback }),
    })
    setSaving(false)
    if (res.ok) {
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, feedback } : r))
      setEditingId(null)
      setEditValue('')
    } else {
      setSaveError('Erro ao guardar.')
    }
  }

  return (
    <table className="w-full text-sm mt-2">
      <thead>
        <tr className="text-left text-xs text-muted-foreground border-b">
          <th className="pb-1 font-normal">Jogo</th>
          <th className="pb-1 font-normal">Avaliador</th>
          <th className="pb-1 font-normal text-right">Nota</th>
          <th className="pb-1 font-normal">Comentário</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const d = new Date(row.gameDate)
          const dateStr = d.toLocaleDateString('pt-PT', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
          const isEditing = editingId === row.id
          return (
            <tr key={row.id} className="border-b align-top">
              <td className="py-2 pr-4 whitespace-nowrap">
                {dateStr} · {row.gameLocation}
              </td>
              <td className="py-2 pr-4">{row.submitterName}</td>
              <td className="py-2 pr-4 text-right">{row.rating.toFixed(2)}</td>
              <td className="py-2">
                {isEditing ? (
                  <div className="space-y-1">
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      rows={2}
                      maxLength={1000}
                      disabled={saving}
                      className="w-full rounded border border-input bg-background px-2 py-1 text-sm"
                    />
                    {saveError && <p className="text-xs text-destructive">{saveError}</p>}
                    <div className="flex gap-2">
                      <Button size="sm" disabled={saving} onClick={() => saveEdit(row.id)}>
                        {saving ? '...' : 'Guardar'}
                      </Button>
                      <Button size="sm" variant="outline" disabled={saving} onClick={cancelEdit}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <span className={row.feedback ? '' : 'text-muted-foreground'}>
                      {row.feedback ?? '—'}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => startEdit(row)}>
                      Editar
                    </Button>
                  </div>
                )}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
