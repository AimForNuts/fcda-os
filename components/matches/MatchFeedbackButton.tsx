'use client'

import Link from 'next/link'
import { Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function MatchFeedbackButton({
  gameId,
  hasSubmittedFeedback,
}: {
  gameId: string
  hasSubmittedFeedback: boolean
}) {
  const { t } = useTranslation()

  return (
    <Button
      className={cn(
        'mt-2 h-10 bg-fcda-gold font-black text-fcda-navy hover:!bg-fcda-gold/90 hover:!text-fcda-navy focus-visible:ring-fcda-gold/45 [a]:hover:!bg-fcda-gold/90 [a]:hover:!text-fcda-navy',
        !hasSubmittedFeedback && 'animate-feedback-pending',
      )}
      nativeButton={false}
      render={<Link href={`/matches/${gameId}/rate`} />}
    >
      <Star className="size-4" aria-hidden />
      {hasSubmittedFeedback
        ? t('matches.showFeedback', { defaultValue: 'Show feedback' })
        : t('matches.giveFeedback', { defaultValue: 'Give feedback' })}
    </Button>
  )
}
