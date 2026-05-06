'use client'

import { useTranslation } from 'react-i18next'

type Props = {
  i18nKey: string
  values?: Record<string, string | number | boolean | null | undefined>
}

export function TranslatedText({ i18nKey, values }: Props) {
  const { t } = useTranslation()
  return <>{t(i18nKey, values)}</>
}
