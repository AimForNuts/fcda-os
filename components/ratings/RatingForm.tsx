'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import type { PlayerPublic } from '@/types'

type Props = {
  gameId: string
  teammates: PlayerPublic[]
  existingRatings: Record<string, number>
  locked: boolean
}

export function RatingForm({ gameId, teammates, existingRatings, locked }: Props) {
  const { t } = useTranslation()
  const [ratings, setRatings] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      teammates.map((p) => [p.id, existingRatings[p.id]?.toString() ?? ''])
    )
  )
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const payload: Record<string, number> = {}
    for (const [id, val] of Object.entries(ratings)) {
      const n = parseFloat(val)
      if (!isNaN(n)) payload[id] = n
    }

    const res = await fetch(`/api/matches/${gameId}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ratings: payload }),
    })

    setSubmitting(false)
    if (res.ok) {
      setSubmitted(true)
    } else {
      setError(t('matches.errors.ratingFailed'))
    }
  }

  if (submitted) {
    return <p className="text-sm text-muted-foreground">{t('matches.ratingSubmitted')}</p>
  }

  if (locked) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('matches.ratingLocked')}</p>
        <table className="w-full text-sm">
          <tbody>
            {teammates.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="py-2">{p.display_name}</td>
                <td className="py-2 text-right">
                  {existingRatings[p.id] != null ? existingRatings[p.id].toFixed(2) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <table className="w-full text-sm">
        <tbody>
          {teammates.map((p) => (
            <tr key={p.id} className="border-b">
              <td className="py-2">{p.display_name}</td>
              <td className="py-2 text-right">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  value={ratings[p.id] ?? ''}
                  onChange={(e) =>
                    setRatings((prev) => ({ ...prev, [p.id]: e.target.value }))
                  }
                  className="w-20 text-right border rounded px-2 py-1"
                  disabled={submitting}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={submitting}>
        {submitting ? t('matches.ratingSubmitting') : t('matches.ratingSubmit')}
      </Button>
    </form>
  )
}
