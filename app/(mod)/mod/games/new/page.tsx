'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const schema = z.object({
  date: z.string().min(1, 'Date is required'),
  location: z.string().min(1, 'Location is required'),
  counts_for_stats: z.boolean(),
})

type FormData = z.infer<typeof schema>

export default function NewGamePage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { counts_for_stats: true },
  })

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
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-fcda-navy mb-6">
        {t('mod.newGame')}
      </h1>
      <Card>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle className="text-base">{t('mod.gameDetails')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}
            <div className="space-y-2">
              <Label htmlFor="date">{t('mod.date')}</Label>
              <Input
                id="date"
                type="datetime-local"
                {...register('date')}
              />
              {errors.date && (
                <p className="text-xs text-destructive">{errors.date.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">{t('mod.location')}</Label>
              <Input
                id="location"
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
                id="counts_for_stats"
                type="checkbox"
                className="h-4 w-4"
                {...register('counts_for_stats')}
              />
              <Label htmlFor="counts_for_stats" className="cursor-pointer">
                {t('mod.countsForStats')}
              </Label>
            </div>
          </CardContent>
          <CardFooter className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              nativeButton={false}
              render={<Link href="/matches" />}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              className="bg-fcda-navy text-white hover:bg-fcda-navy/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? t('common.loading') : t('mod.createGame')}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
