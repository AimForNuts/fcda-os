'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AtSign, KeyRound, Save, UserRound } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Props = {
  displayName: string
  email: string
}

export function AccountForm({ displayName, email }: Props) {
  const { t } = useTranslation()
  const router = useRouter()
  const [name, setName] = useState(displayName)
  const [submitting, setSubmitting] = useState(false)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setSavedMessage(null)
    setError(null)

    const nextName = name.trim()

    if (nextName.length === 0) {
      setSubmitting(false)
      setError(t('profile.account.errors.nameRequired'))
      return
    }

    try {
      const profileRes = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: nextName }),
      })

      if (!profileRes.ok) {
        const data = await profileRes.json().catch(() => ({}))
        const raw = data.error
        setError(typeof raw === 'string' ? raw : t('profile.account.errors.saveFailed'))
        return
      }

      setSavedMessage(t('profile.account.saved'))
      router.refresh()
    } catch {
      setError(t('common.networkError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-fcda-navy">{t('profile.account.title')}</CardTitle>
            <CardDescription>
              {t('profile.account.description')}
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-fcda-navy/15 bg-fcda-ice text-fcda-navy">
            {t('profile.account.badge')}
          </Badge>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="account-display-name">{t('profile.account.name')}</Label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="account-display-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  className="h-10 pl-9"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account-email">{t('profile.account.email')}</Label>
              <div className="relative">
                <AtSign className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="account-email"
                  type="email"
                  value={email}
                  readOnly
                  className="h-10 bg-muted/40 pl-9 text-muted-foreground"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-background text-fcda-navy">
                <KeyRound className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-fcda-navy">{t('profile.account.password')}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {t('profile.account.passwordHint')}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/auth/forgot-password" />}
              className="w-fit"
            >
              {t('profile.account.resetByLink')}
            </Button>
          </div>

          {error ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          {savedMessage ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
              {savedMessage}
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-col items-start justify-between gap-3 border-t md:flex-row md:items-center">
          <p className="text-xs leading-5 text-muted-foreground">
            {t('profile.account.footerNote')}
          </p>
          <Button
            type="submit"
            size="lg"
            disabled={submitting || name.trim() === ''}
            className="min-w-40"
          >
            <Save className="size-4" />
            {submitting ? t('common.saving') : t('profile.account.save')}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
