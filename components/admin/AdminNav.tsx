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
  ]

  return (
    <nav className="flex gap-0 border-b border-border">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            pathname.startsWith(tab.href)
              ? 'border-fcda-navy text-fcda-navy'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}
