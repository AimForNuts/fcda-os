'use client'

import { useRef, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { PLAYER_AVATAR_MAX_BYTES } from '@/lib/players/avatar'

const POSITIONS = ['GK', 'CB', 'CM', 'W', 'ST']

type Props = {
  playerName: string
  sheetName: string
  shirtNumber: number | null
  preferredPositions: string[]
  avatarUrl: string | null
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase()
}

export function ProfileForm({
  playerName,
  sheetName,
  shirtNumber,
  preferredPositions,
  avatarUrl,
}: Props) {
  const [name, setName] = useState(sheetName)
  const [shirt, setShirt] = useState<string>(shirtNumber != null ? String(shirtNumber) : '')
  const [positions, setPositions] = useState<string[]>(preferredPositions)
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(avatarUrl)
  const [submitting, setSubmitting] = useState(false)
  const [photoBusy, setPhotoBusy] = useState<'upload' | 'delete' | null>(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setSaved(false)
    setError(null)

    const parsed = parseInt(shirt, 10)
    const body = {
      sheet_name: name.trim(),
      shirt_number: shirt.trim() === '' ? null : isNaN(parsed) ? null : parsed,
      preferred_positions: positions,
    }

    try {
      const res = await fetch('/api/players/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setSubmitting(false)
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        const data = await res.json().catch(() => ({}))
        const raw = data.error
        setError(typeof raw === 'string' ? raw : 'Erro ao guardar.')
      }
    } catch {
      setSubmitting(false)
      setError('Erro de rede. Tenta novamente.')
    }
  }

  function togglePosition(pos: string) {
    setPositions((prev) =>
      prev.includes(pos) ? prev.filter((p) => p !== pos) : [...prev, pos]
    )
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setPhotoBusy('upload')
    setPhotoError(null)

    const body = new FormData()
    body.set('file', file)

    try {
      const res = await fetch('/api/players/me/photo', {
        method: 'POST',
        body,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const raw = data.error
        setPhotoError(typeof raw === 'string' ? raw : 'Erro ao enviar foto.')
        return
      }
      setCurrentAvatarUrl(typeof data.avatar_url === 'string' ? data.avatar_url : null)
    } catch {
      setPhotoError('Erro de rede. Tenta novamente.')
    } finally {
      setPhotoBusy(null)
      e.target.value = ''
    }
  }

  async function handlePhotoDelete() {
    setPhotoBusy('delete')
    setPhotoError(null)

    try {
      const res = await fetch('/api/players/me/photo', { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const raw = data.error
        setPhotoError(typeof raw === 'string' ? raw : 'Erro ao remover foto.')
        return
      }
      setCurrentAvatarUrl(null)
    } catch {
      setPhotoError('Erro de rede. Tenta novamente.')
    } finally {
      setPhotoBusy(null)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border border-border p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Avatar size="lg" className="h-14 w-14">
              {currentAvatarUrl ? <AvatarImage src={currentAvatarUrl} alt={playerName} /> : null}
              <AvatarFallback className="bg-fcda-gold text-fcda-navy font-semibold">
                {getInitials(playerName)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="text-sm font-medium">Fotografia do jogador</p>
              <p className="text-xs text-muted-foreground">
                JPEG, PNG ou WebP até {Math.round(PLAYER_AVATAR_MAX_BYTES / (1024 * 1024))} MB.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoChange}
            />
            <Button
              type="button"
              variant="outline"
              disabled={photoBusy != null}
              onClick={() => fileInputRef.current?.click()}
            >
              {photoBusy === 'upload' ? 'A enviar...' : currentAvatarUrl ? 'Substituir foto' : 'Carregar foto'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={photoBusy != null || currentAvatarUrl == null}
              onClick={handlePhotoDelete}
            >
              {photoBusy === 'delete' ? 'A remover...' : 'Remover'}
            </Button>
          </div>
        </div>
        {photoError && <p className="mt-3 text-sm text-destructive">{photoError}</p>}
      </div>

      <div className="space-y-2">
        <label htmlFor="profile-name" className="text-sm font-medium">Nome</label>
        <input
          id="profile-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
          disabled={submitting}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="profile-shirt" className="text-sm font-medium">Número de camisola</label>
        <input
          id="profile-shirt"
          type="number"
          value={shirt}
          onChange={(e) => setShirt(e.target.value)}
          min={1}
          max={99}
          className="w-24 rounded border border-input bg-background px-3 py-2 text-sm"
          disabled={submitting}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Posições preferidas</label>
        <div className="flex gap-2 flex-wrap">
          {POSITIONS.map((pos) => (
            <button
              key={pos}
              type="button"
              onClick={() => togglePosition(pos)}
              disabled={submitting}
              className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                positions.includes(pos)
                  ? 'bg-fcda-navy text-white border-fcda-navy'
                  : 'border-input text-muted-foreground hover:bg-muted'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-green-600">Guardado.</p>}

      <Button type="submit" disabled={submitting || name.trim() === ''}>
        {submitting ? 'A guardar...' : 'Guardar'}
      </Button>
    </form>
  )
}
