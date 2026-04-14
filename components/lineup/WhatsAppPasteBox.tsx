'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

type Props = {
  onParse: (text: string) => void
  isParsing: boolean
}

export function WhatsAppPasteBox({ onParse, isParsing }: Props) {
  const { t } = useTranslation()
  const [text, setText] = useState('')

  return (
    <div className="space-y-3">
      <textarea
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono min-h-[160px] resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        placeholder={t('mod.lineup.placeholder')}
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label={t('mod.lineup.whatsappPaste')}
      />
      <Button
        type="button"
        onClick={() => onParse(text)}
        disabled={!text.trim() || isParsing}
        className="bg-fcda-navy text-white hover:bg-fcda-navy/90"
      >
        {isParsing ? t('common.loading') : t('mod.lineup.parse')}
      </Button>
    </div>
  )
}
