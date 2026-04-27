'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'

export function ModSubNav() {
  const { t } = useTranslation()
  const pathname = usePathname()

  const linkClass = (active: boolean) =>
    `whitespace-nowrap py-3 border-b-2 text-sm transition-colors ${
      active
        ? 'border-fcda-navy text-fcda-navy font-medium'
        : 'border-transparent text-muted-foreground hover:text-foreground'
    }`

  return (
    <nav className="border-b bg-background">
      <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="container max-w-screen-xl mx-auto px-4 flex gap-6">
        <Link
          href="/mod/games/new"
          className={linkClass(pathname.startsWith('/mod/games') || pathname.startsWith('/mod/game'))}
        >
          {t('mod.gamesNav')}
        </Link>
        <Link
          href="/mod/ai-assistant"
          className={linkClass(pathname === '/mod/ai-assistant')}
        >
          {t('mod.aiAssistantNav')}
        </Link>
        </div>
      </div>
    </nav>
  )
}
