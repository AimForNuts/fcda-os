'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Props = {
  id: string
  label: string
  value: string
}

export function CalendarSyncField({ id, label, value }: Props) {
  const [copied, setCopied] = useState(false)

  async function copyUrl() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  const Icon = copied ? Check : Copy

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
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
          aria-label={copied ? 'URL copiado' : `Copiar URL de ${label}`}
          title={copied ? 'Copiado' : 'Copiar URL'}
        >
          <Icon className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  )
}
