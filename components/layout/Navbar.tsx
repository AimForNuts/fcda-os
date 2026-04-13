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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Globe, ShieldCheck, Settings } from 'lucide-react'
import type { Profile, UserRole } from '@/types'
import i18n from '@/i18n/config'

type NavbarProps = {
  profile: Profile | null
  roles: UserRole[]
}

export function Navbar({ profile, roles }: NavbarProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const supabase = createClient()

  const isMod = roles.includes('mod') || roles.includes('admin')
  const isAdmin = roles.includes('admin')

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  function toggleLanguage() {
    const next = i18n.language === 'en' ? 'pt-PT' : 'en'
    i18n.changeLanguage(next)
  }

  const initials = profile?.display_name
    ? profile.display_name.slice(0, 2).toUpperCase()
    : '?'

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="text-green-600">FCDA</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link
            href="/matches"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('nav.matches')}
          </Link>
          <Link
            href="/stats"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('nav.stats')}
          </Link>
          {isMod && (
            <Link
              href="/mod/games/new"
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings className="h-3.5 w-3.5" />
              {t('nav.mod')}
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin/users"
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {t('nav.admin')}
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
            className="h-8 w-8 p-0"
            aria-label="Toggle language"
          >
            <Globe className="h-4 w-4" />
          </Button>

          {profile ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="relative inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted focus-visible:outline-none"
                aria-label="User menu"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-green-600 text-white text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{profile.display_name}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href="/profile" />}>
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
                render={<Link href="/auth/login" />}
              >
                {t('nav.login')}
              </Button>
              <Button size="sm" render={<Link href="/auth/register" />}>
                {t('nav.register')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
