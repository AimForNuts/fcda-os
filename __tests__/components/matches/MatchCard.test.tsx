import { render, screen } from '@testing-library/react'
import { MatchCard } from '@/components/matches/MatchCard'
import type { Game } from '@/types'

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

describe('MatchCard', () => {
  it('renders the game location', () => {
    render(<MatchCard game={baseGame} />)
    expect(screen.getByText('Arca de Água')).toBeTruthy()
  })

  it('shows score when game is finished', () => {
    const finished: Game = { ...baseGame, status: 'finished', score_a: 3, score_b: 2 }
    render(<MatchCard game={finished} />)
    expect(screen.getByText('3 – 2')).toBeTruthy()
  })

  it('does not show score when game is scheduled', () => {
    render(<MatchCard game={baseGame} />)
    expect(screen.queryByText(/–/)).toBeNull()
  })

  it('links to the match detail page', () => {
    render(<MatchCard game={baseGame} />)
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/matches/game-1')
  })

  it('shows Agendado badge for scheduled game', () => {
    render(<MatchCard game={baseGame} />)
    expect(screen.getByText('Agendado')).toBeTruthy()
  })

  it('shows Terminado badge for finished game', () => {
    const finished: Game = { ...baseGame, status: 'finished', score_a: 1, score_b: 0 }
    render(<MatchCard game={finished} />)
    expect(screen.getByText('Terminado')).toBeTruthy()
  })

  it('shows Cancelado badge for cancelled game', () => {
    const cancelled: Game = { ...baseGame, status: 'cancelled' }
    render(<MatchCard game={cancelled} />)
    expect(screen.getByText('Cancelado')).toBeTruthy()
  })
})
