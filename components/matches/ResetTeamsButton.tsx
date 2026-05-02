'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  gameId: string
  playerIds: string[]
  className?: string
  buttonClassName?: string
  size?: 'sm' | 'lg'
}

export function ResetTeamsButton({ gameId, playerIds, className, buttonClassName, size = 'sm' }: Props) {
  const router = useRouter()
  const [isResetting, setIsResetting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleReset() {
    if (playerIds.length === 0 || isResetting) return
    const confirmed = window.confirm('Limpar as equipas deste jogo? A convocatória será mantida.')
    if (!confirmed) return

    setIsResetting(true)
    setError(null)
    try {
      const res = await fetch(`/api/games/${gameId}/lineup`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          players: playerIds.map((playerId) => ({
            player_id: playerId,
            team: null,
            is_captain: false,
          })),
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error ?? 'Erro ao limpar equipas.')
        return
      }

      router.refresh()
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Button
        type="button"
        size={size}
        variant="destructive"
        className={buttonClassName}
        onClick={handleReset}
        disabled={isResetting || playerIds.length === 0}
      >
        <RotateCcw aria-hidden="true" />
        {isResetting ? 'A limpar…' : 'Limpar equipas'}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  )
}
