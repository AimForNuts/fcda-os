"use client"

import { useEffect, useState } from 'react'
import { X, ZoomIn } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

type PlayerPhotoZoomProps = {
  avatarUrl: string | null
  displayName: string
  fallback: string
  avatarClassName?: string
  fallbackClassName?: string
}

export function PlayerPhotoZoom({
  avatarUrl,
  displayName,
  fallback,
  avatarClassName,
  fallbackClassName,
}: PlayerPhotoZoomProps) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen])

  const avatar = (
    <Avatar
      className={cn(
        'size-28 border-4 border-white/25 shadow-2xl shadow-black/15 sm:size-36 lg:size-44',
        avatarClassName
      )}
    >
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
      <AvatarFallback
        className={cn('bg-fcda-gold text-3xl font-semibold text-fcda-navy sm:text-4xl', fallbackClassName)}
      >
        {fallback}
      </AvatarFallback>
    </Avatar>
  )

  if (!avatarUrl) return avatar

  return (
    <>
      <button
        type="button"
        aria-label="Ampliar foto"
        aria-haspopup="dialog"
        className="group relative rounded-full focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-white/70"
        onClick={() => setIsOpen(true)}
      >
        {avatar}
        <span className="absolute right-1 bottom-1 flex size-8 items-center justify-center rounded-full bg-black/55 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 sm:right-2 sm:bottom-2">
          <ZoomIn className="size-4" />
        </span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={displayName}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setIsOpen(false)}
        >
          <button
            type="button"
            aria-label="Fechar foto"
            className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-white/60"
            onClick={() => setIsOpen(false)}
          >
            <X className="size-5" />
          </button>
          <div
            role="img"
            aria-label={displayName}
            className="h-[88vh] w-[92vw] rounded-2xl bg-contain bg-center bg-no-repeat shadow-2xl"
            style={{ backgroundImage: `url("${avatarUrl}")` }}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
