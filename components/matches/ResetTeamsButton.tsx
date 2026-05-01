'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

type Props = {
  gameId: string
  playerIds: string[]
}

export function ResetTeamsButton({ gameId, playerIds }: Props) {
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
    <span className="inline-flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="destructive"
        onClick={handleReset}
        disabled={isResetting || playerIds.length === 0}
      >
        {isResetting ? 'A limpar…' : 'Limpar equipas'}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  )
}
