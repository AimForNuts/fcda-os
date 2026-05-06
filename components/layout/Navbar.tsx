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
import {
  Bot,
  CalendarDays,
  ChevronDown,
  ExternalLink,
  Globe,
  LogOut,
  Menu,
  MessageSquareText,
  Pencil,
  Settings,
  ShieldCheck,
  Star,
  Trophy,
  UserCheck,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react'
import type { Profile, UserRole } from '@/types'
import i18n, { LANGUAGE_STORAGE_KEY } from '@/i18n/config'
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
  pendingFeedbackCount?: number
  linkedPlayer?: LinkedPlayer | null
}

export function Navbar({ profile, roles, pendingCount, pendingFeedbackCount = 0, linkedPlayer = null }: NavbarProps) {
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
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, next)
    } catch {
      /* ignore quota / private mode */
    }
  }

  const avatarLabel = linkedPlayer?.name ?? profile?.display_name ?? '?'
  const initials = avatarLabel ? avatarLabel.slice(0, 2).toUpperCase() : '?'
  const renderUserMenuAvatar = () => (
    <Avatar className="h-8 w-8">
      {linkedPlayer?.avatar_url ? (
        <AvatarImage src={linkedPlayer.avatar_url} alt={avatarLabel} />
      ) : null}
      <AvatarFallback className="bg-fcda-gold text-fcda-navy text-xs font-bold">
        {initials}
      </AvatarFallback>
    </Avatar>
  )

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
  const matchesNavItems = [
    {
      href: '/matches/calendario',
      label: t('nav.matchesMenu.calendar'),
      description: t('nav.matchesMenu.calendarDescription'),
      icon: CalendarDays,
    },
    {
      href: '/matches/resultados',
      label: t('nav.matchesMenu.results'),
      description: t('nav.matchesMenu.resultsDescription'),
      icon: Trophy,
    },
    {
      href: '/matches/os-meus-jogos',
      label: t('nav.matchesMenu.myGames'),
      description: t('nav.matchesMenu.myGamesDescription'),
      icon: UserCheck,
    },
  ]
  const mainNavItems = [
    { href: '/players', label: t('nav.players') },
    { href: '/stats', label: t('nav.stats') },
  ]
  const adminMenuItems = [
    {
      href: '/admin/users',
      label: t('nav.userMenu.admin.users'),
      description: t('nav.userMenu.admin.usersDescription'),
      icon: UsersRound,
      count: pendingCount,
    },
    {
      href: '/admin/players',
      label: t('nav.userMenu.admin.players'),
      description: t('nav.userMenu.admin.playersDescription'),
      icon: UserRound,
      count: 0,
    },
    {
      href: '/admin/ratings',
      label: t('nav.userMenu.admin.ratings'),
      description: t('nav.userMenu.admin.ratingsDescription'),
      icon: Star,
      count: 0,
    },
    {
      href: '/admin/feedback',
      label: t('nav.userMenu.admin.feedback'),
      description: t('nav.userMenu.admin.feedbackDescription'),
      icon: MessageSquareText,
      count: 0,
    },
    {
      href: '/admin/ai-rating',
      label: t('nav.userMenu.admin.aiRating'),
      description: t('nav.userMenu.admin.aiRatingDescription'),
      icon: Bot,
      count: 0,
    },
  ]
  const isActiveHref = (href: string) => pathname === href || pathname.startsWith(`${href}/`)
  const mainNavLinkClass = (active: boolean) =>
    `inline-flex h-full items-center border-b-2 py-7 text-sm font-black uppercase transition-colors ${
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
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/crest.png" alt="FCDA crest" className="h-18 w-18 object-contain" />
          <span className="hidden text-lg tracking-normal text-white md:inline">
            <span className="font-light">FC </span>
            <span className="font-extrabold">Dragões da Areosa</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden h-full items-center gap-7 md:flex">
          <DropdownMenu>
            <DropdownMenuTrigger
              className={`${mainNavLinkClass(isActiveHref('/matches'))} relative gap-1 bg-transparent focus-visible:outline-none`}
              aria-current={isActiveHref('/matches') ? 'page' : undefined}
            >
              {t('nav.matches')}
              <ChevronDown className="size-3.5" aria-hidden />
              {pendingFeedbackCount > 0 ? (
                <span className="absolute right-0 top-5 h-2 w-2 rounded-full bg-red-500" />
              ) : null}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72 p-2">
              {matchesNavItems.map((item) => {
                const Icon = item.icon
                const active = isActiveHref(item.href)
                const count = item.href === '/matches/os-meus-jogos' ? pendingFeedbackCount : 0

                return (
                  <DropdownMenuItem
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    className="items-start gap-3 px-3 py-2.5"
                  >
                    <Icon className={`mt-0.5 size-4 ${active ? 'text-fcda-blue' : 'text-fcda-navy'}`} />
                    <span className="min-w-0">
                      <span className={`flex items-center gap-2 font-medium ${active ? 'text-fcda-blue' : ''}`}>
                        {item.label}
                        {count > 0 ? (
                          <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                            {count}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    </span>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
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
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              href="/admin/users"
              className={`relative hidden h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-white/10 hover:text-white md:inline-flex ${
                isActiveHref('/admin') ? 'text-fcda-gold' : 'text-white/70'
              }`}
              aria-label={t('nav.admin')}
              aria-current={isActiveHref('/admin') ? 'page' : undefined}
              title={t('nav.admin')}
            >
              <ShieldCheck className="h-4 w-4" />
              {pendingCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500" />
              )}
            </Link>
          )}
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
              <div className="relative inline-flex h-8 w-8 items-center justify-center rounded-full md:hidden">
                {renderUserMenuAvatar()}
              </div>
              <DropdownMenuTrigger
                className="relative hidden h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 focus-visible:outline-none md:inline-flex"
                aria-label="User menu"
              >
                {renderUserMenuAvatar()}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-2">
                <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-3">
                  <Avatar className="h-10 w-10">
                    {linkedPlayer?.avatar_url ? (
                      <AvatarImage src={linkedPlayer.avatar_url} alt={avatarLabel} />
                    ) : null}
                    <AvatarFallback className="bg-fcda-gold text-fcda-navy text-sm font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-fcda-navy">
                      {profile.display_name}
                    </p>
                    {linkedPlayer ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {linkedPlayer.name}
                      </p>
                    ) : null}
                  </div>
                </div>
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuItem
                  onClick={() => router.push('/profile')}
                  className="items-start gap-3 px-3 py-2.5"
                >
                  <Settings className="mt-0.5 size-4 text-fcda-navy" />
                  <span className="min-w-0">
                    <span className="block font-medium">
                      {t('nav.userMenu.preferences')}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {t('nav.userMenu.preferencesDescription')}
                    </span>
                  </span>
                </DropdownMenuItem>
                {linkedPlayer ? (
                  <>
                    <DropdownMenuItem
                      onClick={() => router.push('/profile/player')}
                      className="items-start gap-3 px-3 py-2.5"
                    >
                      <Pencil className="mt-0.5 size-4 text-fcda-navy" />
                      <span className="min-w-0">
                        <span className="block font-medium">
                          {t('nav.userMenu.editPlayer')}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {t('nav.userMenu.editPlayerDescription')}
                        </span>
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push(`/players/${linkedPlayer.id}`)}
                      className="items-start gap-3 px-3 py-2.5"
                    >
                      <UserRound className="mt-0.5 size-4 text-fcda-navy" />
                      <span className="min-w-0">
                        <span className="flex items-center gap-1 font-medium">
                          {t('nav.userMenu.myPlayer')}
                          <ExternalLink className="size-3 text-muted-foreground" />
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {t('nav.userMenu.myPlayerDescription')}
                        </span>
                      </span>
                    </DropdownMenuItem>
                  </>
                ) : null}
                {isAdmin ? (
                  <>
                    <DropdownMenuSeparator className="my-2" />
                    <div className="px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {t('nav.userMenu.admin.title')}
                    </div>
                    {adminMenuItems.map((item) => {
                      const Icon = item.icon

                      return (
                        <DropdownMenuItem
                          key={item.href}
                          onClick={() => router.push(item.href)}
                          className="items-start gap-3 px-3 py-2.5"
                        >
                          <Icon className="mt-0.5 size-4 text-fcda-navy" />
                          <span className="min-w-0">
                            <span className="flex items-center gap-2 font-medium">
                              {item.label}
                              {item.count > 0 ? (
                                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                                  {item.count}
                                </span>
                              ) : null}
                            </span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {item.description}
                            </span>
                          </span>
                        </DropdownMenuItem>
                      )
                    })}
                  </>
                ) : null}
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="items-center gap-3 px-3 py-2.5 text-destructive"
                >
                  <LogOut className="size-4" />
                  <span className="font-medium">{t('nav.userMenu.signOut')}</span>
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
              <Link
                href="/matches"
                onClick={() => setIsOpen(false)}
                className={drawerNavLinkClass(isActiveHref('/matches'))}
                aria-current={isActiveHref('/matches') ? 'page' : undefined}
              >
                {t('nav.matches')}
                {pendingFeedbackCount > 0 ? (
                  <span className="ml-1 h-2 w-2 rounded-full bg-red-500" />
                ) : null}
              </Link>
              <div className="border-b border-white/10 pb-2 pl-3">
                {matchesNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`block rounded px-2 py-2 text-sm transition-colors ${
                      isActiveHref(item.href)
                        ? 'text-fcda-gold'
                        : 'text-white/55 hover:text-white'
                    }`}
                    aria-current={isActiveHref(item.href) ? 'page' : undefined}
                  >
                    <span className="inline-flex items-center gap-2">
                      {item.label}
                      {item.href === '/matches/os-meus-jogos' && pendingFeedbackCount > 0 ? (
                        <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                          {pendingFeedbackCount}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                ))}
              </div>
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
                      {t('nav.userMenu.preferences')}
                    </Link>
                    {linkedPlayer ? (
                      <>
                        <Link
                          href="/profile/player"
                          onClick={() => setIsOpen(false)}
                          className={drawerLinkClass}
                        >
                          {t('nav.userMenu.editPlayer')}
                        </Link>
                        <Link
                          href={`/players/${linkedPlayer.id}`}
                          onClick={() => setIsOpen(false)}
                          className={drawerLinkClass}
                        >
                          {t('nav.userMenu.myPlayer')}
                        </Link>
                      </>
                    ) : null}
                    {isAdmin ? (
                      <div className="border-b border-white/10 py-3">
                        <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
                          {t('nav.userMenu.admin.title')}
                        </p>
                        {adminMenuItems.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-2 px-2 py-2 text-sm text-white/70 transition-colors hover:text-white"
                          >
                            <span className="min-w-0 truncate">{item.label}</span>
                            {item.count > 0 ? (
                              <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                                {item.count}
                              </span>
                            ) : null}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => { setIsOpen(false); handleLogout() }}
                      className={`${drawerLinkClass} w-full text-left text-red-400 hover:text-red-300`}
                    >
                      {t('nav.userMenu.signOut')}
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
