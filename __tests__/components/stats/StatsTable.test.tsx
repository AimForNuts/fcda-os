import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { StatsTable } from '@/components/stats/StatsTable'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, options?: Record<string, number>) => {
      const map: Record<string, string> = {
        'stats.colRank': 'Pos.',
        'players.colNumber': '#',
        'players.colPlayer': 'Jogador',
        'players.nameLabel': 'Nome',
        'players.searchPlaceholder': 'Procurar jogador...',
        'stats.colGames': 'Jogos',
        'stats.colWins': 'Vitórias',
        'stats.colDraws': 'Empates',
        'stats.colLosses': 'Derrotas',
        'stats.colPoints': 'Pontos',
        'stats.colForm': 'Forma',
        'stats.colPointsPerGame': 'Pts/Jogo',
        'stats.colWinRate': 'Vit. %',
        'stats.leadersTitle': 'Líderes atuais',
        'stats.leadersSubtitle': 'Top três por pontos em jogos competitivos.',
        'stats.leadersSubtitleAllGames': 'Top três incluindo amigáveis.',
        'stats.includeFriendlyMatchesLabel': 'Incluir amigáveis',
        'stats.tableTitle': 'Classificação completa',
        'stats.yourRank': 'A tua posição',
        'stats.recordLabel': `${options?.wins}V ${options?.draws}E ${options?.losses}D`,
        'stats.formWin': 'Vitória',
        'stats.formDraw': 'Empate',
        'stats.formLoss': 'Derrota',
        'stats.formWinShort': 'V',
        'stats.formDrawShort': 'E',
        'stats.formLossShort': 'D',
        'stats.noForm': '-',
        'stats.tiebreakerNote': 'A classificação ordena por pontos.',
        'stats.noPlayers': 'Ainda sem dados de jogadores.',
        'stats.anonymisedNote': 'Inicia sessão para ver os nomes dos jogadores.',
      }
      return map[k] ?? k
    },
  }),
}))
import type { PlayerStats } from '@/types'
import type { LeaderboardFormByPlayerId } from '@/lib/stats/leaderboard'

const players: PlayerStats[] = [
  {
    id: '1',
    display_name: 'Carlos Silva',
    shirt_number: 10,
    nationality: 'PT',
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
    nationality: 'PT',
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

const formByPlayerId: LeaderboardFormByPlayerId = {
  '1': {
    all: ['win', 'draw', 'loss'],
    competitive: ['win'],
  },
  '2': {
    all: ['loss'],
    competitive: ['loss'],
  },
}

function getTableBody() {
  return within(screen.getByRole('table'))
}

function getTableRowForPlayer(name: string) {
  const table = getTableBody()
  const cell = table.queryByRole('link', { name }) ?? table.getByText(name)
  const row = cell.closest('tr')
  expect(row).toBeTruthy()
  return row!
}

describe('StatsTable', () => {
  it('renders player names', () => {
    render(<StatsTable players={players} isAnonymised={false} />)
    expect(screen.getAllByText('Carlos Silva').length).toBeGreaterThan(0)
  })

  it('renders leaderboard columns', () => {
    render(<StatsTable players={players} isAnonymised={false} />)
    expect(screen.getByRole('columnheader', { name: /^Pos\.$/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Forma/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Pontos/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Pts\/Jogo/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Vit\. %/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Jogos/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Vitórias/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Empates/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Derrotas/i })).toBeInTheDocument()
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
    expect(screen.getByText(/sem dados/i)).toBeInTheDocument()
  })

  it('renders shirt number next to the player name when present', () => {
    render(<StatsTable players={players} isAnonymised={false} />)
    expect(screen.getAllByText('10').length).toBeGreaterThan(0)
  })

  it('renders player name as a link when not anonymised', () => {
    render(<StatsTable players={players} isAnonymised={false} />)
    const link = screen.getAllByRole('link', { name: 'Carlos Silva' })[0]
    expect(link).toHaveAttribute('href', '/players/1')
  })

  it('does not render player name as a link when anonymised', () => {
    render(<StatsTable players={players} isAnonymised={true} />)
    expect(screen.queryByRole('link', { name: 'Carlos Silva' })).not.toBeInTheDocument()
  })

  it('does not render friendly toggle unless enabled', () => {
    render(<StatsTable players={players} isAnonymised={false} />)
    expect(screen.queryByRole('switch', { name: /Incluir amigáveis/i })).not.toBeInTheDocument()
  })

  it('renders friendly toggle when requested', () => {
    render(
      <StatsTable players={players} isAnonymised={false} friendlyRankingToggle />
    )
    expect(screen.getByRole('switch', { name: /Incluir amigáveis/i })).toBeInTheDocument()
    expect(screen.getByText(/Top três por pontos em jogos competitivos/)).toBeInTheDocument()
  })

  it('uses all-match totals when friendly toggle is on', () => {
    render(
      <StatsTable players={players} isAnonymised={false} friendlyRankingToggle />
    )
    fireEvent.click(screen.getByRole('switch', { name: /Incluir amigáveis/i }))
    expect(screen.getByText(/Top três incluindo amigáveis/)).toBeInTheDocument()
    const carlosRow = getTableRowForPlayer('Carlos Silva')
    expect(within(carlosRow).getAllByRole('cell')[6]).toHaveTextContent('20')
  })

  it('displays competitive totals', () => {
    render(<StatsTable players={players} isAnonymised={false} />)
    const carlosRow = getTableRowForPlayer('Carlos Silva')
    expect(within(carlosRow).getAllByRole('cell')[6]).toHaveTextContent('10')
  })

  it('renders recent competitive form', () => {
    render(
      <StatsTable
        players={players}
        formByPlayerId={formByPlayerId}
        isAnonymised={false}
      />
    )

    expect(screen.getAllByLabelText('Forma: Vitória').length).toBeGreaterThan(0)
    expect(screen.queryByLabelText('Forma: Vitória, Empate, Derrota')).not.toBeInTheDocument()
  })

  it('shows sort indicator on Pontos column by default', () => {
    render(<StatsTable players={players} isAnonymised={false} />)
    const pointsHeader = screen.getByRole('columnheader', { name: /Pontos/i })
    expect(pointsHeader).toHaveAttribute('aria-sort', 'descending')
  })

  it('filters players by name', () => {
    render(<StatsTable players={players} isAnonymised={false} />)
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Carlos' } })
    const table = getTableBody()
    expect(table.getByText('Carlos Silva')).toBeInTheDocument()
    expect(table.queryByText('Jogador 2')).not.toBeInTheDocument()
  })

  it('shows points-based standing when filtering, not the visible row index', () => {
    render(<StatsTable players={players} isAnonymised={false} />)
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Jogador 2' } })
    const row = getTableRowForPlayer('Jogador 2')
    const cells = within(row!).getAllByRole('cell')
    expect(cells[0]).toHaveTextContent('2')
  })

  it('keeps points-based standing when sorting by another column', () => {
    render(<StatsTable players={players} isAnonymised={false} />)
    fireEvent.click(screen.getByRole('columnheader', { name: /Jogos/i }))
    const carlosRow = getTableRowForPlayer('Carlos Silva')
    const jogadorRow = getTableRowForPlayer('Jogador 2')
    expect(within(carlosRow!).getAllByRole('cell')[0]).toHaveTextContent('1')
    expect(within(jogadorRow!).getAllByRole('cell')[0]).toHaveTextContent('2')
  })

  it('highlights the linked player row', () => {
    render(
      <StatsTable
        players={players}
        isAnonymised={false}
        highlightedPlayerId="1"
      />
    )

    const row = getTableRowForPlayer('Carlos Silva')
    expect(row).toHaveClass('bg-fcda-gold/10')
    expect(row).toHaveClass('font-semibold')
  })
})
