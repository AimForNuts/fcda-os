'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  gameId: string
}

export function DeleteGameButton({ gameId }: Props) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (isDeleting) return
    const confirmed = window.confirm('Eliminar este jogo? Esta ação não pode ser anulada.')
    if (!confirmed) return

    setIsDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/games/${gameId}`, { method: 'DELETE' })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error ?? 'Erro ao eliminar jogo.')
        return
      }

      router.push('/matches')
      router.refresh()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="destructive"
        onClick={handleDelete}
        disabled={isDeleting}
      >
        <Trash2 aria-hidden="true" />
        {isDeleting ? 'A eliminar...' : 'Eliminar jogo'}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  )
}
