'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'

const footerSections = [
  {
    titleKey: 'footer.club',
    links: [
      { href: '/', labelKey: 'nav.home' },
      { href: '/matches', labelKey: 'nav.matches' },
      { href: '/players', labelKey: 'nav.players' },
      { href: '/stats', labelKey: 'nav.stats' },
    ],
  },
  {
    titleKey: 'footer.privateArea',
    links: [
      { href: '/auth/login', labelKey: 'nav.login' },
      { href: '/auth/register', labelKey: 'nav.register' },
      { href: '/profile', labelKey: 'nav.profile' },
    ],
  },
]

export function SiteFooter() {
  const { t } = useTranslation()
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-white/10 bg-fcda-navy text-white">
      <div className="grid w-full gap-10 px-6 py-10 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(9rem,0.28fr)_minmax(9rem,0.28fr)] lg:gap-16">
        <section className="space-y-12">
          <Link href="/" className="inline-flex items-center gap-3">
            <Image
              src="/crest.png"
              alt="FCDA crest"
              width={72}
              height={72}
              className="h-16 w-16 object-contain"
            />
            <span className="min-w-0 text-lg tracking-normal text-white sm:text-xl">
              <span className="font-light">FC </span>
              <span className="font-extrabold">Dragões da Areosa</span>
            </span>
          </Link>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/45">
              {t('footer.officialSponsors')}
            </p>
            <div className="mt-4 flex items-center">
              <Image
                src="/barrigas.png"
                alt="Restaurante Snack-Bar Barrigas"
                width={72}
                height={72}
                className="h-14 w-14 rounded-full object-contain opacity-75 grayscale transition hover:opacity-100 hover:grayscale-0"
              />
            </div>
          </div>
        </section>

        {footerSections.map((section) => (
          <nav key={section.titleKey} aria-label={t(section.titleKey)} className="lg:justify-self-end">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/45">
              {t(section.titleKey)}
            </h2>
            <ul className="mt-4 space-y-3">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm font-medium text-white/75 transition-colors hover:text-fcda-gold"
                  >
                    {t(link.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="flex w-full flex-col gap-2 px-6 py-5 text-sm text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© FCDA {currentYear}</p>
          <p>Futebol Clube Dragões da Areosa</p>
        </div>
      </div>
    </footer>
  )
}
