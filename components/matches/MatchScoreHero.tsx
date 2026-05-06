'use client'

import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import { useTranslatedTeamPresentation } from '@/components/i18n/useTranslatedTeamPresentation'
import type { MatchTeam } from '@/lib/games/team-presentation'

type TeamScorePanelProps = {
  team: MatchTeam
  score: number | null
}

function TeamScorePanel({ team, score }: TeamScorePanelProps) {
  const presentation = useTranslatedTeamPresentation(team)

  return (
    <div className="flex items-center justify-center gap-4 sm:gap-6">
      <Image
        src={presentation.imageSrc}
        alt={presentation.imageAlt}
        width={64}
        height={88}
        className="h-14 w-auto shrink-0 object-contain drop-shadow-sm sm:h-16"
      />
      <span className="text-5xl font-black tabular-nums text-white sm:text-6xl">
        {score ?? '-'}
      </span>
    </div>
  )
}

type Props = {
  scoreA: number | null
  scoreB: number | null
}

export function MatchScoreHero({ scoreA, scoreB }: Props) {
  const { t } = useTranslation()

  return (
    <div className="rounded-[2rem] bg-fcda-navy p-4 text-white shadow-lg shadow-fcda-navy/10 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-6">
        <TeamScorePanel team="a" score={scoreA} />
        <div className="flex items-center justify-center">
          <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-fcda-gold">
            {t('home.versus')}
          </span>
        </div>
        <TeamScorePanel team="b" score={scoreB} />
      </div>
    </div>
  )
}
