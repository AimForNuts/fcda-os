import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LineupGrid } from '@/components/matches/LineupGrid'
import type { PlayerPublic } from '@/types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => {
      const map: Record<string, string> = {
        'matches.noLineup': 'Convocatória não disponível.',
        'matches.lineup': 'Convocatória',
      }
      return map[k] ?? k
    },
  }),
}))

const makePlayer = (id: string, name: string, shirt?: number): PlayerPublic => ({
  id,
  display_name: name,
  shirt_number: shirt ?? null,
  nationality: 'PT',
  current_rating: null,
  profile_id: null,
  avatar_path: null,
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
    expect(screen.getByText('Equipa Azul')).toBeInTheDocument()
    expect(screen.getByAltText('Kit da Equipa Branca')).toBeInTheDocument()
    expect(screen.getByAltText('Kit da Equipa Azul')).toBeInTheDocument()
    expect(screen.getByText('Carlos')).toBeInTheDocument()
    expect(screen.getByText('João')).toBeInTheDocument()
  })

  it('renders unassigned list when no team assignments', () => {
    const players = [makePlayer('1', 'Rui'), makePlayer('2', 'Pedro')]
    render(<LineupGrid teamA={[]} teamB={[]} unassigned={players} />)
    expect(screen.getByText('Convocatória')).toBeInTheDocument()
    expect(screen.getByText('Rui')).toBeInTheDocument()
    expect(screen.getByText('Pedro')).toBeInTheDocument()
  })

  it('renders shirt number when present', () => {
    const a = [makePlayer('1', 'Nuno', 7)]
    render(<LineupGrid teamA={a} teamB={[]} unassigned={[]} />)
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('renders a placeholder when shirt number is absent', () => {
    const a = [makePlayer('1', 'Rui')]  // makePlayer without shirt arg → shirt_number: null
    render(<LineupGrid teamA={a} teamB={[]} unassigned={[]} />)
    expect(screen.getByText('–')).toBeInTheDocument()
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

  it('renders a captain marker when a player is captain', () => {
    const a = [{ ...makePlayer('1', 'Carlos', 10), is_captain: true }]
    render(<LineupGrid teamA={a} teamB={[]} unassigned={[]} />)
    expect(screen.getByText('(C)')).toBeInTheDocument()
  })
})
