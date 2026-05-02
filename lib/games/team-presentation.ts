export type MatchTeam = 'a' | 'b'

export type TeamPresentation = {
  team: MatchTeam
  label: string
  imageSrc: string
  imageAlt: string
  headerSurfaceClassName: string
  headerLabelClassName: string
}

export const TEAM_PRESENTATIONS: Record<MatchTeam, TeamPresentation> = {
  a: {
    team: 'a',
    label: 'Equipa Branca',
    imageSrc: '/kit_white.png',
    imageAlt: 'Kit da Equipa Branca',
    headerSurfaceClassName: 'border-border/80 bg-background/90',
    headerLabelClassName: 'text-fcda-navy dark:text-white',
  },
  b: {
    team: 'b',
    label: 'Equipa Azul',
    imageSrc: '/kit_black.png',
    imageAlt: 'Kit da Equipa Azul',
    headerSurfaceClassName:
      'border-fcda-navy/10 bg-fcda-navy/[0.05] dark:border-white/10 dark:bg-white/5',
    headerLabelClassName: 'text-fcda-navy dark:text-white',
  },
}

export function getTeamPresentation(team: MatchTeam) {
  return TEAM_PRESENTATIONS[team]
}
