'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock } from 'lucide-react'

export default function PendingPage() {
  const { t } = useTranslation()

  return (
    <Card className="text-center">
      <CardHeader>
        <div className="flex justify-center mb-2">
          <Clock className="h-12 w-12 text-muted-foreground" />
        </div>
        <CardTitle>{t('auth.pending.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          {t('auth.pending.description')}
        </p>
        <p className="text-muted-foreground text-xs">
          {t('auth.pending.publicNote')}
        </p>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/" />}
        >
          {t('nav.home')}
        </Button>
      </CardContent>
    </Card>
  )
}
