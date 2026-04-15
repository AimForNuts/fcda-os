import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LineupGrid } from '@/components/matches/LineupGrid'
import type { PlayerPublic } from '@/types'

const makePlayer = (id: string, name: string, shirt?: number): PlayerPublic => ({
  id,
  display_name: name,
  shirt_number: shirt ?? null,
  current_rating: null,
  profile_id: null,
})

describe('LineupGrid', () => {
  it('shows empty state when no players', () => {
    render(<LineupGrid teamA={[]} teamB={[]} unassigned={[]} />)
    expect(screen.getByText('Convocatória não disponível.')).toBeInTheDocument()
  })

  it('renders two columns when teamA and teamB have players', () => {
    const a = [makePlayer('1', 'Carlos', 10)]
    const b = [makePlayer('2', 'João', 5)]
    render(<LineupGrid teamA={a} teamB={b} unassigned={[]} />)
    expect(screen.getByText('Equipa Branca')).toBeInTheDocument()
    expect(screen.getByText('Equipa Preta')).toBeInTheDocument()
    expect(screen.getByText('Carlos')).toBeInTheDocument()
    expect(screen.getByText('João')).toBeInTheDocument()
  })

  it('renders unassigned list when no team assignments', () => {
    const players = [makePlayer('1', 'Rui'), makePlayer('2', 'Pedro')]
    render(<LineupGrid teamA={[]} teamB={[]} unassigned={players} />)
    expect(screen.getByText('Convocados')).toBeInTheDocument()
    expect(screen.getByText('Rui')).toBeInTheDocument()
    expect(screen.getByText('Pedro')).toBeInTheDocument()
  })

  it('renders shirt number when present', () => {
    const a = [makePlayer('1', 'Nuno', 7)]
    render(<LineupGrid teamA={a} teamB={[]} unassigned={[]} />)
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('does not render shirt number when absent', () => {
    const a = [makePlayer('1', 'Rui')]  // makePlayer without shirt arg → shirt_number: null
    render(<LineupGrid teamA={a} teamB={[]} unassigned={[]} />)
    expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument()
  })

  it('renders player name as a link when isApproved is true', () => {
    const a = [makePlayer('1', 'Carlos', 10)]
    render(<LineupGrid teamA={a} teamB={[]} unassigned={[]} isApproved={true} />)
    const link = screen.getByRole('link', { name: 'Carlos' })
    expect(link).toHaveAttribute('href', '/players/1')
  })

  it('does not render player name as a link when isApproved is false', () => {
    const a = [makePlayer('1', 'Carlos', 10)]
    render(<LineupGrid teamA={a} teamB={[]} unassigned={[]} isApproved={false} />)
    expect(screen.queryByRole('link', { name: 'Carlos' })).not.toBeInTheDocument()
  })
})
