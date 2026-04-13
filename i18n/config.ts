import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import enCommon from './en/common.json'
import ptPTCommon from './pt-PT/common.json'

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      fallbackLng: 'en',
      defaultNS: 'common',
      resources: {
        en: { common: enCommon },
        'pt-PT': { common: ptPTCommon },
      },
      interpolation: { escapeValue: false },
      detection: {
        order: ['localStorage', 'navigator'],
        caches: ['localStorage'],
        lookupLocalStorage: 'fcda_language',
      },
    })
}

export default i18n
