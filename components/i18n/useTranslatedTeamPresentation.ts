'use client'

import { useTranslation } from 'react-i18next'
import {
  getTeamPresentation,
  type MatchTeam,
  type TeamPresentation,
} from '@/lib/games/team-presentation'

type TranslatedTeamPresentation = TeamPresentation & {
  label: string
  imageAlt: string
}

function withFallback(value: string, key: string, fallback: string) {
  return value === key ? fallback : value
}

export function useTranslatedTeamPresentation(team: MatchTeam): TranslatedTeamPresentation {
  const { t } = useTranslation()
  const presentation = getTeamPresentation(team)

  return {
    ...presentation,
    label: withFallback(t(presentation.labelKey), presentation.labelKey, presentation.label),
    imageAlt: withFallback(t(presentation.imageAltKey), presentation.imageAltKey, presentation.imageAlt),
  }
}
