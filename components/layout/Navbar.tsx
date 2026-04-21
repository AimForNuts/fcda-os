'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Globe, ShieldCheck, Settings } from 'lucide-react'
import type { Profile, UserRole } from '@/types'
import i18n from '@/i18n/config'
import { ThemeToggle } from './ThemeToggle'

type LinkedPlayer = {
  id: string
  name: string
  avatar_url: string | null
}

type NavbarProps = {
  profile: Profile | null
  roles: UserRole[]
  pendingCount: number
  linkedPlayer?: LinkedPlayer | null
}

export function Navbar({ profile, roles, pendingCount, linkedPlayer = null }: NavbarProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const isMod = roles.includes('mod') || roles.includes('admin')
  const isAdmin = roles.includes('admin')

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  function toggleLanguage() {
    const next = i18n.language === 'en' ? 'pt-PT' : 'en'
    i18n.changeLanguage(next)
  }

  const avatarLabel = linkedPlayer?.name ?? profile?.display_name ?? '?'

  const initials = avatarLabel
    ? avatarLabel.slice(0, 2).toUpperCase()
    : '?'

  return (
    <header className="sticky top-0 z-50 w-full bg-fcda-navy text-white shadow-md">
      <div className="flex h-14 w-full items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 font-bold text-lg tracking-wide">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/crest.png" alt="FCDA crest" className="h-8 w-8 object-contain" />
          <span className="text-fcda-gold">FCDA</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link
            href="/matches"
            className="text-white/70 hover:text-white transition-colors"
          >
            {t('nav.matches')}
          </Link>
          <Link
            href="/players"
            className="text-white/70 hover:text-white transition-colors"
          >
            {t('nav.players')}
          </Link>
          <Link
            href="/stats"
            className="text-white/70 hover:text-white transition-colors"
          >
            {t('nav.stats')}
          </Link>
          {isMod && (
            <Link
              href="/mod/games/new"
              className="flex items-center gap-1 text-white/70 hover:text-white transition-colors"
            >
              <Settings className="h-3.5 w-3.5" />
              {t('nav.mod')}
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin/users"
              className="relative flex items-center gap-1 text-white/70 hover:text-white transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {t('nav.admin')}
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-2 h-2 w-2 rounded-full bg-red-500" />
              )}
            </Link>
          )}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Language toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="h-8 gap-1 px-2 text-white/70 hover:text-white hover:bg-white/10"
            aria-label="Toggle language"
          >
            <Globe className="h-4 w-4" />
            <span className="text-xs font-medium">
              {i18n.language === 'pt-PT' ? 'PT' : 'EN'}
            </span>
          </Button>
          <ThemeToggle />

          {profile ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="relative inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 focus-visible:outline-none"
                aria-label="User menu"
              >
                <Avatar className="h-8 w-8">
                  {linkedPlayer?.avatar_url ? (
                    <AvatarImage src={linkedPlayer.avatar_url} alt={avatarLabel} />
                  ) : null}
                  <AvatarFallback className="bg-fcda-gold text-fcda-navy text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{profile.display_name}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/profile')}>
                  {t('nav.profile')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive"
                >
                  {t('nav.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                nativeButton={false}
                className="text-white/80 hover:text-white hover:bg-white/10"
                render={<Link href="/auth/login" />}
              >
                {t('nav.login')}
              </Button>
              <Button
                size="sm"
                nativeButton={false}
                className="bg-fcda-gold text-fcda-navy hover:bg-fcda-gold/90 font-semibold"
                render={<Link href="/auth/register" />}
              >
                {t('nav.register')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
