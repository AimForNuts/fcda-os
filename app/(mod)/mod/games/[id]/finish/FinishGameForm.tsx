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
  score_a: z.number().int().min(0, 'Score must be 0 or more'),
  score_b: z.number().int().min(0, 'Score must be 0 or more'),
})

type FormData = z.infer<typeof schema>

export function FinishGameForm({ gameId }: { gameId: string }) {
  const { t } = useTranslation()
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { score_a: 0, score_b: 0 },
  })

  async function onSubmit(data: FormData) {
    setServerError(null)
    const res = await fetch(`/api/games/${gameId}/finish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      setServerError(t('mod.finish.errorFinish'))
      return
    }

    router.refresh()
    router.push(`/matches/${gameId}`)
  }

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardHeader>
          <CardTitle className="text-base">{t('mod.finish.score')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {serverError && (
            <p role="alert" className="text-sm text-destructive">
              {serverError}
            </p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="score_a">{t('mod.finish.scoreA')}</Label>
              <Input
                id="score_a"
                type="number"
                min="0"
                className="text-center text-xl font-bold"
                aria-invalid={!!errors.score_a}
                aria-describedby={errors.score_a ? 'score_a_error' : undefined}
                {...register('score_a', { valueAsNumber: true })}
              />
              {errors.score_a && (
                <p
                  id="score_a_error"
                  role="alert"
                  className="text-xs text-destructive"
                >
                  {errors.score_a.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="score_b">{t('mod.finish.scoreB')}</Label>
              <Input
                id="score_b"
                type="number"
                min="0"
                className="text-center text-xl font-bold"
                aria-invalid={!!errors.score_b}
                aria-describedby={errors.score_b ? 'score_b_error' : undefined}
                {...register('score_b', { valueAsNumber: true })}
              />
              {errors.score_b && (
                <p
                  id="score_b_error"
                  role="alert"
                  className="text-xs text-destructive"
                >
                  {errors.score_b.message}
                </p>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('mod.finish.warning')}
          </p>
        </CardContent>
        <CardFooter className="flex gap-2 justify-end">
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
            {isSubmitting ? t('common.loading') : t('mod.finish.confirm')}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
