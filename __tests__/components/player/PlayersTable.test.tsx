import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlayersTable } from '@/components/player/PlayersTable'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => {
      const map: Record<string, string> = {
        'players.colNumber': '#',
        'players.colPlayer': 'Jogador',
        'players.colGames': 'Jogos',
        'players.nameLabel': 'Nome',
        'players.searchPlaceholder': 'Procurar jogador...',
        'stats.noPlayers': 'Ainda sem dados de jogadores.',
      }
      return map[k] ?? k
    },
  }),
}))

const players = [
  {
    id: '1',
    display_name: 'André Monforte',
    shirt_number: 29,
    profile_id: null,
    avatar_path: null,
    avatar_url: null,
    preferred_positions: ['CB', 'CM'],
    total_all: 2,
  },
]

describe('PlayersTable', () => {
  it('does not render rating details on player cards', () => {
    render(<PlayersTable players={players} isApproved={true} />)
    expect(screen.queryByText('Nota')).not.toBeInTheDocument()
  })

  it('renders player cards as links to profiles', () => {
    render(<PlayersTable players={players} isApproved={true} />)
    expect(screen.getByText('André Monforte')).toBeInTheDocument()
    expect(screen.getByText('Defesa')).toBeInTheDocument()
    expect(screen.getByText('Médio')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Ver perfil de André Monforte' })
    ).toHaveAttribute('href', '/players/1')
  })
})
