'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
import { Globe, ShieldCheck, Menu, X } from 'lucide-react'
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
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const hamburgerRef = useRef<HTMLButtonElement>(null)
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
  const initials = avatarLabel ? avatarLabel.slice(0, 2).toUpperCase() : '?'

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus()
    } else {
      hamburgerRef.current?.focus()
    }
  }, [isOpen])

  const drawerLinkClass =
    'block px-2 py-3 text-white/70 hover:text-white transition-colors text-sm border-b border-white/10 last:border-0'
  const mainNavItems = [
    { href: '/matches', label: t('nav.matches') },
    { href: '/players', label: t('nav.players') },
    { href: '/stats', label: t('nav.stats') },
  ]
  const isActiveHref = (href: string) => pathname === href || pathname.startsWith(`${href}/`)
  const mainNavLinkClass = (active: boolean) =>
    `border-b-2 py-7 text-sm font-black uppercase transition-colors ${
      active
        ? 'border-fcda-gold text-fcda-gold'
        : 'border-transparent text-white/70 hover:text-white'
    }`
  const drawerNavLinkClass = (active = false) =>
    `${drawerLinkClass} ${active ? 'border-b-fcda-gold text-fcda-gold' : ''}`

  return (
    <header className="sticky top-0 z-50 w-full bg-fcda-navy text-white shadow-md">
      <div className="flex h-20 w-full items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/crest.png" alt="FCDA crest" className="h-18 w-18 object-contain" />
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden h-full items-center gap-7 md:flex">
          {mainNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={mainNavLinkClass(isActiveHref(item.href))}
              aria-current={isActiveHref(item.href) ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin/users"
              className={`relative flex items-center gap-1 ${mainNavLinkClass(isActiveHref('/admin'))}`}
              aria-current={isActiveHref('/admin') ? 'page' : undefined}
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
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
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

          {/* Hamburger button — mobile only */}
          <button
            ref={hamburgerRef}
            type="button"
            className="md:hidden rounded p-1 text-white/70 hover:text-white"
            aria-label="Open menu"
            aria-expanded={isOpen}
            aria-controls="mobile-nav-drawer"
            onClick={() => setIsOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile backdrop + drawer */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            id="mobile-nav-drawer"
            className="fixed inset-y-0 right-0 z-50 flex w-64 flex-col bg-fcda-navy shadow-xl md:hidden"
          >
            {/* Drawer header */}
            <div className="flex h-20 items-center justify-between border-b border-white/10 px-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/crest.png" alt="FCDA crest" className="h-16 w-16 object-contain" />
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close menu"
                className="rounded p-1 text-white/70 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer nav links */}
            <nav className="flex flex-col overflow-y-auto px-4 py-2">
              <Link href="/" onClick={() => setIsOpen(false)} className={drawerNavLinkClass(pathname === '/')}>
                {t('nav.home')}
              </Link>
              {mainNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={drawerNavLinkClass(isActiveHref(item.href))}
                  aria-current={isActiveHref(item.href) ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  href="/admin/users"
                  onClick={() => setIsOpen(false)}
                  className={drawerNavLinkClass(isActiveHref('/admin'))}
                  aria-current={isActiveHref('/admin') ? 'page' : undefined}
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {t('nav.admin')}
                    {pendingCount > 0 && (
                      <span className="ml-1 h-2 w-2 rounded-full bg-red-500" />
                    )}
                  </span>
                </Link>
              )}

              {/* Auth section */}
              <div className="mt-4 border-t border-white/10 pt-4">
                {profile ? (
                  <>
                    <Link href="/profile" onClick={() => setIsOpen(false)} className={drawerLinkClass}>
                      {t('nav.profile')}
                    </Link>
                    <button
                      type="button"
                      onClick={() => { setIsOpen(false); handleLogout() }}
                      className={`${drawerLinkClass} w-full text-left text-red-400 hover:text-red-300`}
                    >
                      {t('nav.logout')}
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/auth/login" onClick={() => setIsOpen(false)} className={drawerLinkClass}>
                      {t('nav.login')}
                    </Link>
                    <Link href="/auth/register" onClick={() => setIsOpen(false)} className={drawerLinkClass}>
                      {t('nav.register')}
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        </>
      )}
    </header>
  )
}
