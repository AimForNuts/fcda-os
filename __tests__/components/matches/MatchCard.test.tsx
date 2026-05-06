import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MatchCard } from '@/components/matches/MatchCard'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => {
      const map: Record<string, string> = {
        'matches.status.scheduled': 'Agendado',
        'matches.status.finished': 'Concluído',
        'matches.status.cancelled': 'Cancelado',
      }
      return map[k] ?? k
    },
  }),
}))
import type { Game } from '@/types'
import type { LineupSummary } from '@/components/matches/MatchCard'

const baseGame: Game = {
  id: 'game-1',
  date: '2026-05-01T10:00:00.000Z',
  location: 'Arca de Água',
  status: 'scheduled',
  counts_for_stats: true,
  score_a: null,
  score_b: null,
  created_by: 'user-1',
  finished_by: null,
  finished_at: null,
  created_at: '2026-04-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
}

const lineup: LineupSummary = {
  teamA: [{ id: 'p1', name: 'SELAS', avatar_url: null, shirt_number: 7, nationality: 'PT', is_captain: true }],
  teamB: [
    {
      id: 'p2',
      name: 'andre monforte',
      avatar_url: null,
      shirt_number: null,
      nationality: 'PT',
      is_captain: false,
    },
  ],
  unassigned: [],
}

describe('MatchCard', () => {
  it('renders the game location', () => {
    render(<MatchCard game={baseGame} />)
    expect(screen.getByText('Arca de Água')).toBeInTheDocument()
  })

  it('shows score when game is finished', () => {
    const finished: Game = { ...baseGame, status: 'finished', score_a: 3, score_b: 2 }
    render(<MatchCard game={finished} />)
    expect(screen.getByText('3 – 2')).toBeInTheDocument()
  })

  it('does not show score when game is scheduled', () => {
    render(<MatchCard game={baseGame} />)
    expect(screen.queryByText(/–/)).not.toBeInTheDocument()
  })

  it('links to the match detail page', () => {
    render(<MatchCard game={baseGame} />)
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/matches/game-1')
  })

  it('shows Agendado badge for scheduled game', () => {
    render(<MatchCard game={baseGame} />)
    expect(screen.getByText('Agendado')).toBeInTheDocument()
  })

  it('labels competitive games with icon-only badge', () => {
    render(<MatchCard game={baseGame} />)
    expect(screen.queryByText('Competitivo')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Jogo competitivo')).toBeInTheDocument()
  })

  it('labels friendly games with icon-only badge', () => {
    render(<MatchCard game={{ ...baseGame, counts_for_stats: false }} />)
    expect(screen.queryByText('Amigável')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Jogo amigável')).toBeInTheDocument()
  })

  it('formats scheduled game time in Portugal time', () => {
    render(<MatchCard game={baseGame} />)
    expect(screen.getAllByText('11:00').length).toBeGreaterThan(0)
  })

  it('shows Concluído badge for finished game', () => {
    const finished: Game = { ...baseGame, status: 'finished', score_a: 1, score_b: 0 }
    render(<MatchCard game={finished} />)
    expect(screen.getByText('Concluído')).toBeInTheDocument()
  })

  it('shows Cancelado badge for cancelled game', () => {
    const cancelled: Game = { ...baseGame, status: 'cancelled' }
    render(<MatchCard game={cancelled} />)
    expect(screen.getByText('Cancelado')).toBeInTheDocument()
  })

  it('scheduled game starts expanded — player names are visible', () => {
    render(<MatchCard game={baseGame} lineup={lineup} />)
    expect(screen.getByText('Selas')).toBeInTheDocument()
  })

  it('finished game starts collapsed — player names are not visible', () => {
    const finished: Game = { ...baseGame, status: 'finished', score_a: 2, score_b: 1 }
    render(<MatchCard game={finished} lineup={lineup} />)
    expect(screen.queryByText('Selas')).not.toBeInTheDocument()
  })

  it('clicking the toggle on a finished game expands the player list', () => {
    const finished: Game = { ...baseGame, status: 'finished', score_a: 2, score_b: 1 }
    render(<MatchCard game={finished} lineup={lineup} />)
    fireEvent.click(screen.getByRole('button', { name: /toggle players/i }))
    expect(screen.getByText('Selas')).toBeInTheDocument()
  })

  it('clicking the toggle on an expanded card collapses the player list', () => {
    render(<MatchCard game={baseGame} lineup={lineup} />)
    fireEvent.click(screen.getByRole('button', { name: /toggle players/i }))
    expect(screen.queryByText('Selas')).not.toBeInTheDocument()
  })

  it('title-cases ALL-CAPS names', () => {
    render(<MatchCard game={baseGame} lineup={lineup} />)
    expect(screen.getByText('Selas')).toBeInTheDocument()
    expect(screen.queryByText('SELAS')).not.toBeInTheDocument()
  })

  it('title-cases all-lowercase names', () => {
    render(<MatchCard game={baseGame} lineup={lineup} />)
    expect(screen.getByText('Andre Monforte')).toBeInTheDocument()
  })

  it('shows shirt number when provided', () => {
    render(<MatchCard game={baseGame} lineup={lineup} />)
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('shows captain marker for captain players', () => {
    render(<MatchCard game={baseGame} lineup={lineup} />)
    expect(screen.getByText('(C)')).toBeInTheDocument()
  })

  it('shows a shirt number placeholder when missing', () => {
    render(<MatchCard game={baseGame} lineup={lineup} />)
    expect(screen.getByText('–')).toBeInTheDocument()
  })

  it('cancelled game starts collapsed — player names are not visible', () => {
    const cancelled: Game = { ...baseGame, status: 'cancelled' }
    render(<MatchCard game={cancelled} lineup={lineup} />)
    expect(screen.queryByText('Selas')).not.toBeInTheDocument()
  })

  it('toggle button is not rendered when there is no lineup', () => {
    render(<MatchCard game={baseGame} />)
    expect(screen.queryByRole('button', { name: /toggle players/i })).not.toBeInTheDocument()
  })

  it('renders team headers with kit images when lineup teams are present', () => {
    render(<MatchCard game={baseGame} lineup={lineup} />)

    expect(screen.getAllByText('Equipa Branca').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Equipa Azul').length).toBeGreaterThan(0)
    expect(screen.getByAltText('Kit da Equipa Branca')).toBeInTheDocument()
    expect(screen.getByAltText('Kit da Equipa Azul')).toBeInTheDocument()
  })

  it('shows the comment count', () => {
    render(<MatchCard game={baseGame} commentCount={4} />)

    expect(screen.getByLabelText('4 comentários')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
  })
})
