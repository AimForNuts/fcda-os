'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'

export function AdminNav() {
  const { t } = useTranslation()
  const pathname = usePathname()

  const tabs = [
    { href: '/admin/users', label: t('admin.users') },
    { href: '/admin/players', label: t('admin.players') },
    { href: '/admin/ratings', label: t('admin.ratings') },
    { href: '/admin/feedback', label: t('admin.feedback') },
    { href: '/admin/coach', label: t('admin.coach') },
  ]

  return (
    <nav className="overflow-x-auto border-b border-border [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="flex">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              pathname.startsWith(tab.href)
                ? 'border-fcda-gold text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
