'use client'

import Image from 'next/image'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export function PlayersPageHero() {
  const { t, i18n } = useTranslation('common')

  useEffect(() => {
    document.title = `${t('nav.players')} — FCDA`
  }, [t, i18n.language])

  return (
    <section className="bg-fcda-navy text-white">
      <div className="container mx-auto grid max-w-screen-xl gap-8 px-4 py-10 md:grid-cols-[1fr_auto] md:items-end md:py-14">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-fcda-gold">
            Futebol Clube Dragões da Areosa
          </p>
          <h1 className="mt-3 text-5xl font-black uppercase tracking-tight md:text-7xl">
            {t('nav.players')}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 md:text-base">
            {t('players.heroSubtitle')}
          </p>
        </div>
        <Image
          src="/crest.png"
          alt=""
          width={160}
          height={160}
          className="hidden h-40 w-40 object-contain opacity-90 drop-shadow-lg md:block"
          aria-hidden
        />
      </div>
    </section>
  )
}
