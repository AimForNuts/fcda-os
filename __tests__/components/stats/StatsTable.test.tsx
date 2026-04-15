import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatsTable } from '@/components/stats/StatsTable'
import type { PlayerPublic } from '@/types'

const players: PlayerPublic[] = [
  { id: '1', display_name: 'Carlos Silva', shirt_number: 10, current_rating: 7.5, profile_id: null },
  { id: '2', display_name: 'Jogador 2', shirt_number: null, current_rating: null, profile_id: null },
]

describe('StatsTable', () => {
  it('renders player names', () => {
    render(<StatsTable players={players} isAnonymised={false} />)
    expect(screen.getByText('Carlos Silva')).toBeInTheDocument()
  })

  it('renders formatted rating with one decimal place', () => {
    render(<StatsTable players={players} isAnonymised={false} />)
    expect(screen.getByText('7.5')).toBeInTheDocument()
  })

  it('renders dash for null rating', () => {
    render(<StatsTable players={players} isAnonymised={false} />)
    expect(screen.getAllByText('–')).toHaveLength(1)
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
    expect(screen.queryByRole('link', { name: 'Carlos Silva' })).not.toBeInTheDocument()
  })
})
