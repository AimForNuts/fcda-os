'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Camera, Check, ExternalLink, Flag, Hash, Save, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NationalityFlag } from '@/components/player/NationalityFlag'
import {
  DEFAULT_NATIONALITY,
  NATIONALITY_OPTIONS,
  getNationalityLabel,
  normalizeNationality,
} from '@/lib/nationality'
import { PLAYER_AVATAR_MAX_BYTES } from '@/lib/players/avatar'
import { cn } from '@/lib/utils'

const POSITIONS = ['GK', 'CB', 'CM', 'W', 'ST'] as const

type Props = {
  playerId: string
  playerName: string
  sheetName: string
  shirtNumber: number | null
  nationality: string
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
  playerId,
  playerName,
  sheetName,
  shirtNumber,
  nationality,
  preferredPositions,
  avatarUrl,
}: Props) {
  const { t } = useTranslation()
  const [name, setName] = useState(sheetName)
  const [shirt, setShirt] = useState<string>(shirtNumber != null ? String(shirtNumber) : '')
  const [nationalityValue, setNationalityValue] = useState(normalizeNationality(nationality))
  const [positions, setPositions] = useState<string[]>(preferredPositions)
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(avatarUrl)
  const [submitting, setSubmitting] = useState(false)
  const [photoBusy, setPhotoBusy] = useState<'upload' | 'delete' | null>(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const displayName = name.trim() || playerName
  const shirtLabel = shirt.trim() === '' ? t('profile.player.noNumber') : `#${shirt.trim()}`
  const normalizedNationality = normalizeNationality(nationalityValue)
  const positionSummary = positions.length > 0 ? positions.join(' · ') : t('profile.player.choosePositions')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setSaved(false)
    setError(null)

    const parsed = parseInt(shirt, 10)
    const body = {
      sheet_name: name.trim(),
      shirt_number: shirt.trim() === '' ? null : isNaN(parsed) ? null : parsed,
      nationality: normalizedNationality,
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
        setError(typeof raw === 'string' ? raw : t('profile.player.errors.saveFailed'))
      }
    } catch {
      setSubmitting(false)
      setError(t('common.networkError'))
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
        setPhotoError(typeof raw === 'string' ? raw : t('profile.player.errors.photoUploadFailed'))
        return
      }
      setCurrentAvatarUrl(typeof data.avatar_url === 'string' ? data.avatar_url : null)
    } catch {
      setPhotoError(t('common.networkError'))
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
        setPhotoError(typeof raw === 'string' ? raw : t('profile.player.errors.photoRemoveFailed'))
        return
      }
      setCurrentAvatarUrl(null)
    } catch {
      setPhotoError(t('common.networkError'))
    } finally {
      setPhotoBusy(null)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-fcda-navy">
                <Camera className="size-4" />
                {t('profile.player.photoTitle')}
              </CardTitle>
              <CardDescription>
                {t('profile.player.photoDescription')}
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className={cn(
                'border-transparent',
                currentAvatarUrl
                  ? 'bg-fcda-ice text-fcda-navy'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {currentAvatarUrl ? t('profile.player.photoActive') : t('profile.player.photoOptional')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-[1.75rem] border border-border/70 bg-gradient-to-b from-fcda-ice/70 via-background to-background p-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <Avatar size="lg" className="h-24 w-24 shadow-sm ring-4 ring-background">
                {currentAvatarUrl ? <AvatarImage src={currentAvatarUrl} alt={displayName} /> : null}
                <AvatarFallback className="bg-fcda-gold text-lg font-semibold text-fcda-navy">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="text-lg font-semibold text-fcda-navy">{displayName}</p>
                <p className="text-sm text-muted-foreground">{shirtLabel}</p>
                <p className="text-sm text-muted-foreground">
                  <NationalityFlag
                    nationality={normalizedNationality}
                    className="mr-1 inline-block h-3.5 w-5"
                  />
                  {getNationalityLabel(normalizedNationality)}
                </p>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {positionSummary}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 p-4 text-xs leading-5 text-muted-foreground">
            {t('profile.player.photoRequirements', {
              size: Math.round(PLAYER_AVATAR_MAX_BYTES / (1024 * 1024)),
            })}
          </div>

          {photoError ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {photoError}
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2 border-t bg-transparent p-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handlePhotoChange}
          />
          <Button
            type="button"
            disabled={photoBusy != null}
            onClick={() => fileInputRef.current?.click()}
            className="h-10 px-4"
          >
            {photoBusy === 'upload'
              ? t('profile.player.uploadingPhoto')
              : currentAvatarUrl
                ? t('profile.player.replacePhoto')
                : t('profile.player.uploadPhoto')}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={photoBusy != null || currentAvatarUrl == null}
            onClick={handlePhotoDelete}
            className="h-10 px-4"
          >
            {photoBusy === 'delete' ? t('profile.player.removingPhoto') : t('common.remove')}
          </Button>
        </CardFooter>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-fcda-navy">{t('profile.player.title')}</CardTitle>
              <CardDescription>
                {t('profile.player.description')}
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-fcda-navy/15 bg-fcda-ice text-fcda-navy">
              {t('profile.player.editable')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_10rem_12rem]">
            <div className="space-y-2">
              <Label htmlFor="profile-name">{t('profile.player.name')}</Label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  className="h-10 pl-9"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-shirt">{t('profile.player.number')}</Label>
              <div className="relative">
                <Hash className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="profile-shirt"
                  type="number"
                  value={shirt}
                  onChange={(e) => setShirt(e.target.value)}
                  min={1}
                  max={99}
                  className="h-10 pl-9 [appearance:textfield]"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-nationality">{t('profile.player.nationality')}</Label>
              <div className="relative">
                <Flag className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="profile-nationality"
                  list="profile-nationality-options"
                  type="text"
                  value={nationalityValue}
                  onChange={(e) => setNationalityValue(e.target.value.toUpperCase().slice(0, 2))}
                  onBlur={() => setNationalityValue(normalizeNationality(nationalityValue))}
                  maxLength={2}
                  placeholder={DEFAULT_NATIONALITY}
                  className="h-10 pl-9 uppercase"
                  disabled={submitting}
                />
                <datalist id="profile-nationality-options">
                  {NATIONALITY_OPTIONS.map((code) => (
                    <option key={code} value={code}>
                      {getNationalityLabel(code)}
                    </option>
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1">
                <Label>{t('profile.player.preferredPositions')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('profile.player.preferredPositionsHint')}
                </p>
              </div>
              <Badge variant="outline" className="border-border/80 bg-background text-muted-foreground">
                {t('profile.player.selectionCount', { count: positions.length })}
              </Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {POSITIONS.map((pos) => {
                const isSelected = positions.includes(pos)

                return (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => togglePosition(pos)}
                    disabled={submitting}
                    className={cn(
                      'group rounded-2xl border p-4 text-left transition-all',
                      isSelected
                        ? 'border-fcda-navy bg-fcda-navy text-white shadow-sm'
                        : 'border-border bg-background hover:border-fcda-navy/25 hover:bg-fcda-ice/30'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border',
                          isSelected
                            ? 'border-white/40 bg-white/15 text-white'
                            : 'border-border bg-muted/50 text-transparent'
                        )}
                      >
                        <Check className="size-3.5" />
                      </span>
                      <span className="space-y-1">
                        <span className="block text-sm font-semibold">{pos}</span>
                        <span
                          className={cn(
                            'block text-xs',
                            isSelected ? 'text-white/75' : 'text-muted-foreground'
                          )}
                        >
                          {t(`profile.positions.${pos}`)}
                        </span>
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          {saved ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
              {t('profile.player.saved')}
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-col items-start justify-between gap-3 border-t md:flex-row md:items-center">
          <p className="text-xs leading-5 text-muted-foreground">
            {t('profile.player.footerNote')}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/players/${playerId}`} />}
              className="min-w-36"
            >
              <ExternalLink className="size-4" />
              {t('profile.player.viewPublicPage')}
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={submitting || name.trim() === ''}
              className="min-w-40"
            >
              <Save className="size-4" />
              {submitting ? t('common.saving') : t('profile.player.saveChanges')}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </form>
  )
}
