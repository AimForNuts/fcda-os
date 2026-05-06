'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Plus, X } from 'lucide-react'
import { CompetitiveGameIcon } from '@/components/matches/game-type-icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  date: z.string().min(1, 'Date is required'),
  location: z.string().min(1, 'Location is required'),
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
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { counts_for_stats: true },
  })

  function closeModal() {
    if (isSubmitting) return
    setIsOpen(false)
    setServerError(null)
    reset({ counts_for_stats: true, date: '', location: '' })
  }

  async function onSubmit(data: FormData) {
    setServerError(null)
    const date = new Date(data.date).toISOString()

    const res = await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, date }),
    })

    if (!res.ok) {
      setServerError(t('mod.game.errorCreate'))
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
            className="max-h-[92vh] w-full overflow-hidden rounded-t-xl border border-border bg-background shadow-xl sm:max-w-lg sm:rounded-xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-5">
              <div className="min-w-0 space-y-1">
                <h2 id="new-game-title" className="text-lg font-bold text-fcda-navy">
                  {t('mod.newGame')}
                </h2>
                <p className="text-sm text-muted-foreground">{t('mod.gameDetails')}</p>
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

            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-4 px-4 py-4 sm:px-5">
                {serverError && (
                  <p role="alert" className="text-sm text-destructive">
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
                  <Input
                    id="new-game-location"
                    type="text"
                    placeholder="Arca de Água, Porto"
                    {...register('location')}
                  />
                  {errors.location && (
                    <p className="text-xs text-destructive">{errors.location.message}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="new-game-counts-for-stats"
                    type="checkbox"
                    className="h-4 w-4"
                    {...register('counts_for_stats')}
                  />
                  <Label htmlFor="new-game-counts-for-stats" className="flex cursor-pointer items-center gap-2">
                    <CompetitiveGameIcon className="size-4 shrink-0 text-fcda-blue" aria-hidden />
                    {t('mod.countsForStats')}
                  </Label>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t bg-muted/50 px-4 py-4 sm:px-5">
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
