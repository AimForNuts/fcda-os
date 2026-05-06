'use client'

import { useState } from 'react'
import { useController, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { GameTypeSelector } from '@/components/matches/GameTypeSelector'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RecintoPicker } from '@/components/matches/RecintoPicker'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const schema = z.object({
  date: z.string().min(1, 'Date is required'),
  location: z.string().min(1, 'Location is required'),
  recinto_id: z.union([z.string().uuid(), z.literal('')]).nullable().optional(),
  counts_for_stats: z.boolean(),
})

type FormData = z.infer<typeof schema>

type Props = {
  gameId: string
  defaultDate: string
  defaultLocation: string
  defaultRecintoId: string | null
  defaultCountsForStats: boolean
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function EditGameForm({
  gameId,
  defaultDate,
  defaultLocation,
  defaultRecintoId,
  defaultCountsForStats,
}: Props) {
  const { t } = useTranslation()
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: toDatetimeLocal(defaultDate),
      location: defaultLocation,
      recinto_id: defaultRecintoId,
      counts_for_stats: defaultCountsForStats,
    },
  })

  const { field: locationField } = useController({ name: 'location', control })
  const { field: recintoIdField } = useController({ name: 'recinto_id', control })
  const { field: countsForStatsField } = useController({ name: 'counts_for_stats', control })

  async function onSubmit(data: FormData) {
    setServerError(null)
    const date = new Date(data.date).toISOString()

    const res = await fetch(`/api/games/${gameId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date,
        location: data.location,
        recinto_id: data.recinto_id || null,
        counts_for_stats: data.counts_for_stats,
      }),
    })

    if (!res.ok) {
      const payload = typeof res.json === 'function'
        ? await res.json().catch(() => null)
        : null
      setServerError(
        typeof payload?.error === 'string'
          ? payload.error
          : t('mod.game.errorUpdate'),
      )
      return
    }

    router.refresh()
    router.push(`/matches/${gameId}`)
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight text-fcda-navy">
          {t('mod.editGame')}
        </h1>
        <p className="text-sm text-muted-foreground">
          Ajusta a data, o recinto e o tipo de jogo.
        </p>
      </div>

      <Card className="overflow-visible rounded-lg py-0">
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardHeader className="border-b border-border px-5 py-4">
            <CardTitle className="text-base font-bold">{t('mod.gameDetails')}</CardTitle>
            <CardDescription>Seleciona um recinto recente ou pesquisa no Google Maps.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 px-5 py-5">
            {serverError && (
              <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {serverError}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="date">{t('mod.date')}</Label>
              <Input id="date" type="datetime-local" {...register('date')} />
              {errors.date && (
                <p className="text-xs text-destructive">{errors.date.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">{t('mod.location')}</Label>
              <RecintoPicker
                id="location"
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
          </CardContent>
          <CardFooter className="flex justify-end gap-2 rounded-b-lg border-t bg-muted/40 px-5 py-4">
            <Button
              type="button"
              variant="outline"
              nativeButton={false}
              render={<Link href={`/matches/${gameId}`} />}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              className="bg-fcda-navy text-white hover:bg-fcda-navy/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? t('common.loading') : t('mod.saveChanges')}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
