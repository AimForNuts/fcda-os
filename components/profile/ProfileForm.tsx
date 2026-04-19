'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

const POSITIONS = ['GK', 'CB', 'CM', 'W', 'ST']

type Props = {
  sheetName: string
  shirtNumber: number | null
  preferredPositions: string[]
}

export function ProfileForm({ sheetName, shirtNumber, preferredPositions }: Props) {
  const [name, setName] = useState(sheetName)
  const [shirt, setShirt] = useState<string>(shirtNumber != null ? String(shirtNumber) : '')
  const [positions, setPositions] = useState<string[]>(preferredPositions)
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setSaved(false)
    setError(null)

    const parsed = parseInt(shirt, 10)
    const body = {
      sheet_name: name.trim(),
      shirt_number: shirt.trim() === '' ? null : isNaN(parsed) ? null : parsed,
      preferred_positions: positions,
    }

    const res = await fetch('/api/players/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    setSubmitting(false)
    if (res.ok) {
      setSaved(true)
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Erro ao guardar.')
    }
  }

  function togglePosition(pos: string) {
    setPositions((prev) =>
      prev.includes(pos) ? prev.filter((p) => p !== pos) : [...prev, pos]
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Nome</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
          disabled={submitting}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Número de camisola</label>
        <input
          type="number"
          value={shirt}
          onChange={(e) => setShirt(e.target.value)}
          min={1}
          max={99}
          className="w-24 rounded border border-input bg-background px-3 py-2 text-sm"
          disabled={submitting}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Posições preferidas</label>
        <div className="flex gap-2 flex-wrap">
          {POSITIONS.map((pos) => (
            <button
              key={pos}
              type="button"
              onClick={() => togglePosition(pos)}
              disabled={submitting}
              className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                positions.includes(pos)
                  ? 'bg-fcda-navy text-white border-fcda-navy'
                  : 'border-input text-muted-foreground hover:bg-muted'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-green-600">Guardado.</p>}

      <Button type="submit" disabled={submitting || name.trim() === ''}>
        {submitting ? 'A guardar...' : 'Guardar'}
      </Button>
    </form>
  )
}
