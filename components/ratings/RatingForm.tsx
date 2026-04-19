'use client'

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import type { PlayerPublic } from '@/types'

type Props = {
  gameId: string
  teammates: PlayerPublic[]
  existingRatings: Record<string, number>
  existingFeedbacks: Record<string, string>
  locked: boolean
}

export function RatingForm({ gameId, teammates, existingRatings, existingFeedbacks, locked }: Props) {
  const { t } = useTranslation()
  const [ratings, setRatings] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      teammates.map((p) => [p.id, existingRatings[p.id]?.toString() ?? ''])
    )
  )
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>(() =>
    Object.fromEntries(teammates.map((p) => [p.id, existingFeedbacks[p.id] ?? '']))
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

    const feedbackPayload: Record<string, string> = {}
    for (const [id, text] of Object.entries(feedbacks)) {
      if (text.trim()) feedbackPayload[id] = text.trim()
    }

    const body: { ratings: Record<string, number>; feedbacks?: Record<string, string> } = { ratings: payload }
    if (Object.keys(feedbackPayload).length > 0) body.feedbacks = feedbackPayload

    const res = await fetch(`/api/matches/${gameId}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
              <React.Fragment key={p.id}>
                <tr className="border-b">
                  <td className="py-2">{p.display_name}</td>
                  <td className="py-2 text-right">
                    {existingRatings[p.id] != null ? existingRatings[p.id].toFixed(2) : '—'}
                  </td>
                </tr>
                {existingFeedbacks[p.id] && (
                  <tr>
                    <td colSpan={2} className="pb-2 text-xs text-muted-foreground italic">
                      {existingFeedbacks[p.id]}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left font-normal text-muted-foreground pb-1">Jogador</th>
            <th className="text-right font-normal text-muted-foreground pb-1">Nota (0–10)</th>
          </tr>
        </thead>
        <tbody>
          {teammates.map((p) => (
            <React.Fragment key={p.id}>
              <tr>
                <td className="py-2 pt-3">{p.display_name}</td>
                <td className="py-2 pt-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={ratings[p.id] ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value
                      const n = parseFloat(raw)
                      const clamped = !isNaN(n) ? String(Math.min(10, Math.max(0, n))) : raw
                      setRatings((prev) => ({ ...prev, [p.id]: clamped }))
                    }}
                    className="w-20 text-right border rounded px-2 py-1"
                    disabled={submitting}
                  />
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="pb-3">
                  <textarea
                    value={feedbacks[p.id] ?? ''}
                    onChange={(e) => setFeedbacks((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    placeholder="Comentário (opcional)"
                    disabled={isNaN(parseFloat(ratings[p.id] ?? '')) || submitting}
                    maxLength={300}
                    rows={2}
                    className="w-full border rounded px-2 py-1 text-xs resize-none disabled:opacity-40"
                  />
                </td>
              </tr>
            </React.Fragment>
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
