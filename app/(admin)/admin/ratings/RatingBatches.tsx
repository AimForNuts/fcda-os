'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

type BatchItem = {
  playerId: string
  playerName: string
  rating: number
}

export type Batch = {
  gameId: string
  submittedBy: string
  gameDate: string
  gameLocation: string
  submitterName: string
  items: BatchItem[]
}

type Props = {
  batches: Batch[]
}

export function RatingBatches({ batches: initialBatches }: Props) {
  const { t } = useTranslation()
  const [batches, setBatches] = useState(initialBatches)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAction(
    gameId: string,
    submittedBy: string,
    action: 'approve' | 'reject'
  ) {
    const key = `${gameId}::${submittedBy}`
    setLoading(key)
    setError(null)

    const res = await fetch('/api/admin/ratings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, gameId, submittedBy }),
    })

    setLoading(null)
    if (res.ok) {
      setBatches((prev) =>
        prev.filter((b) => !(b.gameId === gameId && b.submittedBy === submittedBy))
      )
    } else {
      setError(t('admin.errors.ratingFailed'))
    }
  }

  if (batches.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('admin.noRatings')}</p>
  }

  return (
    <div className="space-y-8">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {batches.map((batch) => {
        const key = `${batch.gameId}::${batch.submittedBy}`
        const isLoading = loading === key
        const d = new Date(batch.gameDate)
        const dateStr = d.toLocaleDateString('pt-PT', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })

        return (
          <div key={key} className="border rounded-lg p-4 space-y-3">
            <div>
              <p className="font-medium">
                {dateStr} · {batch.gameLocation}
              </p>
              <p className="text-sm text-muted-foreground">{batch.submitterName}</p>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {batch.items.map((item) => (
                  <tr key={item.playerId} className="border-b">
                    <td className="py-1">{item.playerName}</td>
                    <td className="py-1 text-right">{item.rating.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={isLoading}
                onClick={() => handleAction(batch.gameId, batch.submittedBy, 'approve')}
              >
                {t('admin.approveAll')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isLoading}
                onClick={() => handleAction(batch.gameId, batch.submittedBy, 'reject')}
              >
                {t('admin.rejectAll')}
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
