'use client'

import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { NationalityFlag } from '@/components/player/NationalityFlag'
import { cn } from '@/lib/utils'

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) {
    return '?'
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  }

  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase()
}

type PlayerIdentityProps = {
  name: string
  shirtNumber?: number | null
  /** Where to show #N relative to the name (default: before the name). */
  shirtNumberPlacement?: 'before-name' | 'after-name'
  href?: string
  avatarUrl?: string | null
  nationality?: string | null
  showAvatar?: boolean
  avatarSize?: 'sm' | 'default' | 'lg'
  className?: string
  nameClassName?: string
}

export function PlayerIdentity({
  name,
  shirtNumber = null,
  shirtNumberPlacement = 'before-name',
  href,
  avatarUrl = null,
  nationality = null,
  showAvatar = true,
  avatarSize = 'default',
  className,
  nameClassName,
}: PlayerIdentityProps) {
  const nameNode = href ? (
    <Link href={href} className={cn('truncate hover:underline', nameClassName)}>
      {name}
    </Link>
  ) : (
    <span className={cn('truncate', nameClassName)}>{name}</span>
  )

  const shirtNode =
    shirtNumber != null ? (
      <span className="shrink-0 text-base font-semibold tabular-nums leading-none text-slate-500">
        {shirtNumber}
      </span>
    ) : null
  const nationalityNode = nationality ? (
    <NationalityFlag nationality={nationality} className="h-3.5 w-5" />
  ) : null

  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      {showAvatar && (
        <Avatar size={avatarSize} className="shrink-0">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
          <AvatarFallback className="bg-fcda-gold text-fcda-navy font-semibold">
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>
      )}
      {shirtNumberPlacement === 'before-name' ? shirtNode : null}
      {nationalityNode}
      {nameNode}
      {shirtNumberPlacement === 'after-name' ? shirtNode : null}
    </div>
  )
}
