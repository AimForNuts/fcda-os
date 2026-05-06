import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import enCommon from './en/common.json'
import ptPTCommon from './pt-PT/common.json'

/** Key used by I18nProvider and language toggle — keep in sync everywhere. */
export const LANGUAGE_STORAGE_KEY = 'fcda_language'

/** Initial i18n + SSR language; client components must match this on first paint (see hydration-safe `t()` patterns). */
export const INITIAL_I18N_LANGUAGE = 'en'

// Do NOT use LanguageDetector here — it reads localStorage which only exists
// on the client, causing a server/client hydration mismatch. Language detection
// is handled in I18nProvider via useEffect after hydration.
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    lng: INITIAL_I18N_LANGUAGE, // always start here on server and for hydration
    fallbackLng: INITIAL_I18N_LANGUAGE,
    defaultNS: 'common',
    resources: {
      en: { common: enCommon },
      'pt-PT': { common: ptPTCommon },
    },
    interpolation: { escapeValue: false },
  })
}

export default i18n
