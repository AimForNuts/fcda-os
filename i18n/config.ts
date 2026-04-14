import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import enCommon from './en/common.json'
import ptPTCommon from './pt-PT/common.json'

// Do NOT use LanguageDetector here — it reads localStorage which only exists
// on the client, causing a server/client hydration mismatch. Language detection
// is handled in I18nProvider via useEffect after hydration.
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    lng: 'en', // always start with English on both server and client
    fallbackLng: 'en',
    defaultNS: 'common',
    resources: {
      en: { common: enCommon },
      'pt-PT': { common: ptPTCommon },
    },
    interpolation: { escapeValue: false },
  })
}

export default i18n
