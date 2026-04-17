'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

export type FeedbackItem = {
  id: string
  gameDate: string
  gameLocation: string
  submitterName: string
  content: string
}

type Props = {
  open: FeedbackItem[]
  closed: FeedbackItem[]
}

export function FeedbackInbox({ open: initialOpen, closed: initialClosed }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(initialOpen)
  const [closed, setClosed] = useState(initialClosed)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleClose(id: string) {
    setLoading(id)
    setError(null)

    const res = await fetch(`/api/admin/feedback/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'close' }),
    })

    setLoading(null)
    if (res.ok) {
      const item = open.find((i) => i.id === id)
      if (item) {
        setOpen((prev) => prev.filter((i) => i.id !== id))
        setClosed((prev) => [item, ...prev])
      }
    } else {
      setError(t('admin.errors.feedbackFailed'))
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-8">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <section className="space-y-4">
        <h2 className="text-base font-semibold">{t('admin.openFeedback')}</h2>
        {open.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('admin.noOpenFeedback')}</p>
        ) : (
          open.map((item) => (
            <div key={item.id} className="border rounded-lg p-4 space-y-2">
              <div>
                <p className="font-medium">
                  {formatDate(item.gameDate)} · {item.gameLocation}
                </p>
                <p className="text-sm text-muted-foreground">{item.submitterName}</p>
              </div>
              <p className="text-sm">{item.content}</p>
              <Button
                size="sm"
                variant="outline"
                disabled={loading === item.id}
                onClick={() => handleClose(item.id)}
              >
                {t('admin.closeItem')}
              </Button>
            </div>
          ))
        )}
      </section>

      {closed.length > 0 && (
        <>
          <hr />
          <section className="space-y-4">
            <h2 className="text-base font-semibold text-muted-foreground">
              {t('admin.closedFeedback')}
            </h2>
            {closed.map((item) => (
              <div key={item.id} className="border rounded-lg p-4 space-y-2 opacity-60">
                <div>
                  <p className="font-medium">
                    {formatDate(item.gameDate)} · {item.gameLocation}
                  </p>
                  <p className="text-sm text-muted-foreground">{item.submitterName}</p>
                </div>
                <p className="text-sm">{item.content}</p>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  )
}
