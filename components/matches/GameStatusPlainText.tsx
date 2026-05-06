'use client'

import { useTranslation } from 'react-i18next'
import type { Game } from '@/types'

export function GameStatusPlainText({ status }: { status: Game['status'] }) {
  const { t } = useTranslation()
  return <>{t(`matches.status.${status}`)}</>
}
