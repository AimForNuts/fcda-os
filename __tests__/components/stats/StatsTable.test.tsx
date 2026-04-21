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
    avatar_path: null,
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
    avatar_path: null,
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

  it('renders stat columns Jogos, Vitórias, Empates, Derrotas, Pontos', () => {
    render(<StatsTable players={players} isAnonymised={false} />)
    expect(screen.getByRole('columnheader', { name: /Jogos/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Vitórias/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Empates/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Derrotas/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Pontos/i })).toBeInTheDocument()
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

  it('renders shirt number in the number column when present', () => {
    render(<StatsTable players={players} isAnonymised={false} />)
    expect(screen.getAllByText('10').length).toBeGreaterThan(0)
  })

  it('renders player name as a link when not anonymised', () => {
    render(<StatsTable players={players} isAnonymised={false} />)
    const link = screen.getByRole('link', { name: 'Carlos Silva' })
    expect(link).toHaveAttribute('href', '/players/1')
  })

  it('does not render player name as a link when anonymised', () => {
    render(<StatsTable players={players} isAnonymised={true} />)
    expect(screen.queryByRole('link', { name: 'Carlos Silva' })).not.toBeInTheDocument()
  })

  it('renders toggle buttons Todos and Competitivos', () => {
    render(<StatsTable players={players} isAnonymised={false} />)
    expect(screen.getByRole('button', { name: 'Todos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Competitivos' })).toBeInTheDocument()
  })

  it('displays all-mode totals by default', () => {
    render(<StatsTable players={players} isAnonymised={false} />)
    // Carlos has total_all=20; check it appears
    expect(screen.getByText('20')).toBeInTheDocument()
  })

  it('switches to competitive totals when Competitivos is clicked', () => {
    render(<StatsTable players={players} isAnonymised={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Competitivos' }))
    expect(screen.queryByText('20')).not.toBeInTheDocument()
    expect(screen.getAllByText('10').length).toBeGreaterThan(0)
  })

  it('shows sort indicator on active column', () => {
    render(<StatsTable players={players} isAnonymised={false} />)
    const gamesHeader = screen.getByRole('columnheader', { name: /Jogos/i })
    expect(gamesHeader).toHaveAttribute('aria-sort', 'descending')
  })

  it('filters players by name', () => {
    render(<StatsTable players={players} isAnonymised={false} />)
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Carlos' } })
    expect(screen.getByText('Carlos Silva')).toBeInTheDocument()
    expect(screen.queryByText('Jogador 2')).not.toBeInTheDocument()
  })

  it('highlights the linked player row', () => {
    render(
      <StatsTable
        players={players}
        isAnonymised={false}
        highlightedPlayerId="1"
      />
    )

    expect(screen.getByText('Carlos Silva').closest('tr')).toHaveClass('bg-fcda-gold/10')
    expect(screen.getByText('Carlos Silva').closest('tr')).toHaveClass('font-semibold')
  })
})
