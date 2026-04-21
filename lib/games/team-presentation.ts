export type MatchTeam = 'a' | 'b'

export type TeamPresentation = {
  team: MatchTeam
  label: string
  imageSrc: string
  imageAlt: string
  headerSurfaceClassName: string
  headerLabelClassName: string
  scorePanelClassName: string
  scoreLabelClassName: string
  scoreValueClassName: string
}

export const TEAM_PRESENTATIONS: Record<MatchTeam, TeamPresentation> = {
  a: {
    team: 'a',
    label: 'Equipa Branca',
    imageSrc: '/kit_white.png',
    imageAlt: 'Kit da Equipa Branca',
    headerSurfaceClassName: 'border-border/80 bg-background/90',
    headerLabelClassName: 'text-fcda-navy dark:text-white',
    scorePanelClassName: 'border-white/80 bg-white text-fcda-navy shadow-lg shadow-black/10',
    scoreLabelClassName: 'text-fcda-navy/65',
    scoreValueClassName: 'text-fcda-navy',
  },
  b: {
    team: 'b',
    label: 'Equipa Preta',
    imageSrc: '/kit_black.png',
    imageAlt: 'Kit da Equipa Preta',
    headerSurfaceClassName:
      'border-fcda-navy/10 bg-fcda-navy/[0.05] dark:border-white/10 dark:bg-white/5',
    headerLabelClassName: 'text-fcda-navy dark:text-white',
    scorePanelClassName: 'border-white/12 bg-white/10 text-white backdrop-blur-sm',
    scoreLabelClassName: 'text-white/65',
    scoreValueClassName: 'text-white',
  },
}

export function getTeamPresentation(team: MatchTeam) {
  return TEAM_PRESENTATIONS[team]
}
