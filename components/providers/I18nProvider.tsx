'use client'

import { useEffect, type ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n/config'

const STORAGE_KEY = 'fcda_language'

export function I18nProvider({ children }: { children: ReactNode }) {
  // Apply stored language preference after hydration so server and client
  // first-render always agree on 'en', avoiding hydration mismatches.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && stored !== i18n.language) {
      i18n.changeLanguage(stored)
    }
  }, [])

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
