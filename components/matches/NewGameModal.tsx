'use client'

import { useState } from 'react'
import { useController, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Plus, X } from 'lucide-react'
import { GameTypeSelector } from '@/components/matches/GameTypeSelector'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RecintoPicker } from '@/components/matches/RecintoPicker'

const schema = z.object({
  date: z.string().min(1, 'Date is required'),
  location: z.string().min(1, 'Location is required'),
  recinto_id: z.union([z.string().uuid(), z.literal('')]).nullable().optional(),
  counts_for_stats: z.boolean(),
})

type FormData = z.infer<typeof schema>

export function NewGameModal() {
  const { t } = useTranslation()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { counts_for_stats: true, recinto_id: null },
  })

  const { field: locationField } = useController({ name: 'location', control })
  const { field: recintoIdField } = useController({ name: 'recinto_id', control })
  const { field: countsForStatsField } = useController({ name: 'counts_for_stats', control })

  function closeModal() {
    if (isSubmitting) return
    setIsOpen(false)
    setServerError(null)
    reset({ counts_for_stats: true, date: '', location: '', recinto_id: null })
  }

  async function onSubmit(data: FormData) {
    setServerError(null)
    const date = new Date(data.date).toISOString()
    const payload = {
      date,
      location: data.location,
      counts_for_stats: data.counts_for_stats,
      ...(data.recinto_id ? { recinto_id: data.recinto_id } : {}),
    }

    const res = await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const payload = typeof res.json === 'function'
        ? await res.json().catch(() => null)
        : null
      setServerError(
        typeof payload?.error === 'string'
          ? payload.error
          : t('mod.game.errorCreate'),
      )
      return
    }

    const { id } = await res.json()
    router.push(`/mod/games/${id}/lineup`)
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => setIsOpen(true)}
        className="shrink-0 bg-fcda-navy text-white hover:bg-fcda-navy/90"
      >
        <Plus className="size-4" aria-hidden />
        {t('mod.newGame')}
      </Button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal()
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-game-title"
            className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-xl border border-border bg-background shadow-xl sm:max-w-xl sm:rounded-xl"
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-5">
              <div className="min-w-0 space-y-1">
                <h2 id="new-game-title" className="text-lg font-bold text-fcda-navy">
                  {t('mod.newGame')}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Define a data, escolhe ou cria o recinto e confirma o tipo de jogo.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={t('common.cancel')}
                disabled={isSubmitting}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-5">
                {serverError && (
                  <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {serverError}
                  </p>
                )}

                <div className="space-y-2">
                  <Label htmlFor="new-game-date">{t('mod.date')}</Label>
                  <Input id="new-game-date" type="datetime-local" {...register('date')} />
                  {errors.date && (
                    <p className="text-xs text-destructive">{errors.date.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-game-location">{t('mod.location')}</Label>
                  <RecintoPicker
                    id="new-game-location"
                    placeholder="Arca de Água, Porto"
                    value={locationField.value ?? ''}
                    recintoId={recintoIdField.value ?? null}
                    disabled={isSubmitting}
                    onChange={(next) => {
                      locationField.onChange(next.location)
                      recintoIdField.onChange(next.recintoId)
                    }}
                  />
                  {errors.location && (
                    <p className="text-xs text-destructive">{errors.location.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>{t('mod.gameType')}</Label>
                  <GameTypeSelector
                    value={Boolean(countsForStatsField.value)}
                    disabled={isSubmitting}
                    labels={{
                      competitive: t('matches.gameType.competitive'),
                      friendly: t('matches.gameType.friendly'),
                      aria: t('mod.gameType'),
                      competitiveDescription: t('mod.gameTypeCompetitiveDescription'),
                      friendlyDescription: t('mod.gameTypeFriendlyDescription'),
                    }}
                    onChange={countsForStatsField.onChange}
                  />
                </div>
              </div>

              <div className="flex shrink-0 justify-end gap-2 border-t bg-muted/50 px-4 py-4 sm:px-5">
                <Button type="button" variant="outline" onClick={closeModal} disabled={isSubmitting}>
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  className="bg-fcda-navy text-white hover:bg-fcda-navy/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t('common.loading') : t('mod.createGame')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
