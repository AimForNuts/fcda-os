'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Props = {
  id: string
  label?: string
  labelKey?: string
  value: string
}

export function CalendarSyncField({ id, label, labelKey, value }: Props) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const resolvedLabel = labelKey ? t(labelKey) : (label ?? '')

  async function copyUrl() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  const Icon = copied ? Check : Copy

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{resolvedLabel}</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          readOnly
          value={value}
          className="h-10 min-w-0 flex-1 font-mono text-xs"
        />
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          onClick={copyUrl}
          aria-label={copied ? t('profile.calendarSync.copiedAria') : t('profile.calendarSync.copyUrlAria', { label: resolvedLabel })}
          title={copied ? t('profile.calendarSync.copied') : t('profile.calendarSync.copyUrl')}
        >
          <Icon className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  )
}
