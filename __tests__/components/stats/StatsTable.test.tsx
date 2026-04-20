import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StatsTable } from '@/components/stats/StatsTable'
import type { PlayerStats } from '@/types'

const players: PlayerStats[] = [
  {
    id: '1',
    display_name: 'Carlos Silva',
    shirt_number: 10,
    profile_id: null,
    total_all: 20,
    wins_all: 10,
    draws_all: 5,
    losses_all: 5,
    total_comp: 10,
    wins_comp: 5,
    draws_comp: 3,
    losses_comp: 2,
  },
  {
    id: '2',
    display_name: 'Jogador 2',
    shirt_number: null,
    profile_id: null,
    total_all: 15,
    wins_all: 6,
    draws_all: 4,
    losses_all: 5,
    total_comp: 8,
    wins_comp: 3,
    draws_comp: 2,
    losses_comp: 3,
  },
]

describe('StatsTable', () => {
  it('renders player names', () => {
    render(<StatsTable players={players} isAnonymised={false} />)
    expect(screen.getByText('Carlos Silva')).toBeInTheDocument()
  })

  it('renders stat columns Total, V, E, D, Pts', () => {
    render(<StatsTable players={players} isAnonymised={false} />)
    expect(screen.getByText(/Total/i)).toBeInTheDocument()
    expect(screen.getByText('V')).toBeInTheDocument()
    expect(screen.getByText('E')).toBeInTheDocument()
    expect(screen.getByText('D')).toBeInTheDocument()
    expect(screen.getByText('Pts')).toBeInTheDocument()
  })

  it('shows anonymised note when isAnonymised is true', () => {
    render(<StatsTable players={players} isAnonymised={true} />)
    expect(screen.getByText(/Inicia sessão/)).toBeInTheDocument()
  })

  it('does not show anonymised note when isAnonymised is false', () => {
    render(<StatsTable players={players} isAnonymised={false} />)
    expect(screen.queryByText(/Inicia sessão/)).not.toBeInTheDocument()
  })

  it('renders empty state when no players', () => {
    render(<StatsTable players={[]} isAnonymised={false} />)
    expect(screen.getByText(/Sem dados/)).toBeInTheDocument()
  })

  it('renders shirt number with hash prefix when present', () => {
    render(<StatsTable players={players} isAnonymised={false} />)
    expect(screen.getByText('#10')).toBeInTheDocument()
  })

  it('renders player name as a link when not anonymised', () => {
    render(<StatsTable players={players} isAnonymised={false} />)
    const link = screen.getByRole('link', { name: 'Carlos Silva' })
    expect(link).toHaveAttribute('href', '/players/1')
  })

  it('does not render player name as a link when anonymised', () => {
    render(<StatsTable players={players} isAnonymised={true} />)
    expect(
      screen.queryByRole('link', { name: 'Carlos Silva' }),
    ).not.toBeInTheDocument()
  })

  it('renders toggle buttons Todos and Competitivos', () => {
    render(<StatsTable players={players} isAnonymised={false} />)
    expect(screen.getByRole('button', { name: 'Todos' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Competitivos' }),
    ).toBeInTheDocument()
  })

  it('displays all-mode totals by default', () => {
    render(<StatsTable players={players} isAnonymised={false} />)
    // Carlos has total_all=20; check it appears
    expect(screen.getByText('20')).toBeInTheDocument()
  })

  it('switches to competitive totals when Competitivos is clicked', () => {
    render(<StatsTable players={players} isAnonymised={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Competitivos' }))
    // Carlos has total_comp=10
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('shows sort indicator on active column', () => {
    render(<StatsTable players={players} isAnonymised={false} />)
    // default sort is total desc — header should contain ↓
    const totalHeader = screen.getByText(/Total.*↓/)
    expect(totalHeader).toBeInTheDocument()
  })
})
