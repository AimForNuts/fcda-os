import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LineupManager } from '@/components/lineup/LineupManager'

const refresh = vi.fn()
const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, push }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'mod.lineup.current': 'Current lineup',
        'mod.lineup.noTeamLabel': 'No team',
        'mod.lineup.captain': 'Captain',
        'mod.lineup.captainShort': 'C',
        'mod.lineup.makeCaptain': 'Make captain',
        'mod.lineup.noUnassigned': 'No unassigned players.',
        'mod.lineup.errorCaptainCount': 'Each team can have at most one captain.',
        'mod.lineup.aiCreatePrompt': 'Create prompt',
        'mod.lineup.aiGenerate': 'Generate with AI',
        'mod.lineup.aiGenerating': 'Generating with AI...',
        'mod.lineup.aiGenerateError': 'Failed to generate teams.',
        'mod.lineup.clearTeams': 'Clear teams',
        'mod.lineup.confirmClearTeams': 'Clear team assignments for this game? The lineup will be kept.',
        'mod.lineup.playerColumn': 'Player',
        'mod.lineup.addPlayer': 'Add player',
        'mod.lineup.addPlayerPlaceholder': 'Player name...',
        'mod.lineup.addGuest': 'Add as guest',
        'mod.lineup.alreadyInLineup': 'That player is already in this lineup.',
        'mod.lineup.saveLineup': 'Save Lineup',
        'mod.lineup.teamLabel': 'Team',
        'mod.lineup.whatsappPaste': 'Paste WhatsApp message',
        'common.loading': 'Loading',
      }
      return map[key] ?? key
    },
  }),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

const playerA = '11111111-1111-4111-8111-111111111111'
const playerB = '22222222-2222-4222-8222-222222222222'
const playerC = '33333333-3333-4333-8333-333333333333'

function currentLineup() {
  return [
    {
      player_id: playerA,
      sheet_name: 'Carlos',
      shirt_number: 10,
      nationality: 'PT',
      current_rating: 7,
      avatar_url: null,
      total_games: 4,
      wins: 3,
      team: 'a' as const,
      is_captain: true,
    },
    {
      player_id: playerB,
      sheet_name: 'João',
      shirt_number: 5,
      nationality: 'PT',
      current_rating: null,
      avatar_url: null,
      total_games: 0,
      wins: 0,
      team: 'b' as const,
      is_captain: true,
    },
  ]
}

describe('LineupManager', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    refresh.mockReset()
    push.mockReset()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('changes the captain for a team and saves captain flags', async () => {
    mockFetch.mockResolvedValue({ ok: true })

    render(
      <LineupManager
        gameId="game-1"
        currentLineup={[
          currentLineup()[0],
          { ...currentLineup()[1], team: 'a', is_captain: false },
        ]}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Make captain' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save Lineup' }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/games/game-1/lineup',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            players: [
              {
                player_id: playerA,
                team: 'a',
                is_captain: false,
              },
              {
                player_id: playerB,
                team: 'a',
                is_captain: true,
              },
            ],
          }),
        })
      )
    })
    expect(refresh).toHaveBeenCalled()
  })

  it('adds an existing player to the editable lineup and saves it', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/players?q=Pedro') {
        return Promise.resolve({
          ok: true,
          json: async () => ([{
            id: playerC,
            sheet_name: 'Pedro',
            shirt_number: 8,
            nationality: 'PT',
            avatar_url: null,
          }]),
        })
      }
      if (url === '/api/games/game-1/lineup') {
        return Promise.resolve({ ok: true })
      }
      return Promise.reject(new Error(`Unexpected fetch ${url}`))
    })

    render(<LineupManager gameId="game-1" currentLineup={currentLineup()} />)

    fireEvent.change(screen.getByRole('textbox', { name: 'Add player' }), {
      target: { value: 'Pedro' },
    })
    fireEvent.click(await screen.findByText('Pedro'))
    fireEvent.click(screen.getByRole('button', { name: 'Save Lineup' }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/games/game-1/lineup',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            players: [
              { player_id: playerA, team: 'a', is_captain: true },
              { player_id: playerB, team: 'b', is_captain: true },
              { player_id: playerC, team: null, is_captain: false },
            ],
          }),
        })
      )
    })
  })

  it('creates a guest player from the add control and saves it in the lineup', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/players?q=Guest%20One') {
        return Promise.resolve({ ok: true, json: async () => [] })
      }
      if (url === '/api/players') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: playerC,
            sheet_name: 'Guest One',
            nationality: 'PT',
          }),
        })
      }
      if (url === '/api/games/game-1/lineup') {
        return Promise.resolve({ ok: true })
      }
      return Promise.reject(new Error(`Unexpected fetch ${url}`))
    })

    render(<LineupManager gameId="game-1" currentLineup={currentLineup()} />)

    fireEvent.change(screen.getByRole('textbox', { name: 'Add player' }), {
      target: { value: 'Guest One' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add as guest' }))
    await screen.findByText('Guest One')
    fireEvent.click(screen.getByRole('button', { name: 'Save Lineup' }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/players',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ sheet_name: 'Guest One' }),
        })
      )
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/games/game-1/lineup',
        expect.objectContaining({
          body: JSON.stringify({
            players: [
              { player_id: playerA, team: 'a', is_captain: true },
              { player_id: playerB, team: 'b', is_captain: true },
              { player_id: playerC, team: null, is_captain: false },
            ],
          }),
        })
      )
    })
  })

  it('moves a player between teams with drag and drop', async () => {
    mockFetch.mockResolvedValue({ ok: true })
    const dataTransfer = {
      data: {} as Record<string, string>,
      effectAllowed: '',
      setData(type: string, value: string) {
        this.data[type] = value
      },
      getData(type: string) {
        return this.data[type] ?? ''
      },
    }

    render(
      <LineupManager
        gameId="game-1"
        currentLineup={currentLineup()}
      />
    )

    fireEvent.dragStart(screen.getByText('Carlos'), { dataTransfer })
    fireEvent.drop(screen.getByTestId('drop-team-b'), { dataTransfer })
    fireEvent.click(screen.getByRole('button', { name: 'Save Lineup' }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/games/game-1/lineup',
        expect.objectContaining({
          body: JSON.stringify({
            players: [
              {
                player_id: playerA,
                team: 'b',
                is_captain: true,
              },
              {
                player_id: playerB,
                team: 'b',
                is_captain: false,
              },
            ],
          }),
        })
      )
    })
  })

  it('shows admin-only team averages without counting unrated players or players with no games', () => {
    render(<LineupManager gameId="game-1" currentLineup={currentLineup()} showTeamStats />)

    expect(screen.getByText('7.0')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getAllByText('—')).toHaveLength(2)
  })

  it('generates teams with AI, shows reasoning, applies, and refreshes', async () => {
    mockFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (url === '/api/mod/ai-assistant/generate') {
        const body = JSON.parse(String(init?.body))
        if (body.mode === 'prompt') {
          expect(body).toEqual({ gameId: 'game-1', mode: 'prompt' })
          return Promise.resolve({
            ok: true,
            json: async () => ({
              game_id: 'game-1',
              player_count: 2,
              prompt: {
                system: 'System instructions',
                user: 'Current player ratings table:\n- Carlos',
              },
            }),
          })
        }
        expect(body).toEqual({
          gameId: 'game-1',
          mode: 'generate',
          prompt: {
            system: 'System instructions with manual edit',
            user: 'Current player ratings table:\n- Carlos',
          },
        })
        return Promise.resolve({
          ok: true,
          json: async () => ({
            game_id: 'game-1',
            team_a: {
              label: 'Equipa Branca',
              players: [{
                player_id: playerA,
                sheet_name: 'Carlos',
                shirt_number: 10,
                current_rating: 7,
                preferred_positions: ['CM'],
                avatar_url: null,
                is_captain: true,
              }],
              rating_total: 7,
              average_rating: 7,
            },
            team_b: {
              label: 'Equipa Azul',
              players: [{
                player_id: playerB,
                sheet_name: 'João',
                shirt_number: 5,
                current_rating: 6,
                preferred_positions: ['ST'],
                avatar_url: null,
                is_captain: true,
              }],
              rating_total: 6,
              average_rating: 6,
            },
            balance: { rating_delta: 1, player_count_delta: 0 },
            notes: [],
            reasoning: ['Split the highest rated players.'],
          }),
        })
      }

      if (url === '/api/games/game-1/lineup') {
        expect(JSON.parse(String(init?.body))).toEqual({
          players: [
            { player_id: playerA, team: 'a', is_captain: true },
            { player_id: playerB, team: 'b', is_captain: true },
          ],
        })
        return Promise.resolve({ ok: true, json: async () => ({ ok: true }) })
      }

      return Promise.reject(new Error(`Unexpected fetch ${url}`))
    })

    render(<LineupManager gameId="game-1" currentLineup={currentLineup()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Create prompt' }))
    expect(screen.getByText('Creating prompt for 2 players')).toBeInTheDocument()
    expect(await screen.findByDisplayValue('System instructions')).toBeInTheDocument()
    expect(screen.getByDisplayValue(/Current player ratings table/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('System prompt'), {
      target: { value: 'System instructions with manual edit' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Generate Teams' }))
    expect(screen.getByText('Balancing 2 players')).toBeInTheDocument()
    expect(await screen.findByText('Generated Lineup')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reasoning' }))
    expect(screen.getByText('Split the highest rated players.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Apply to Lineup' }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
  })

  it('shows AI generation errors in the modal without saving', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Model unavailable' }),
    })

    render(<LineupManager gameId="game-1" currentLineup={currentLineup()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Create prompt' }))

    expect(await screen.findByText('Model unavailable')).toBeInTheDocument()
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('clears team assignments while keeping lineup players', async () => {
    mockFetch.mockResolvedValue({ ok: true })

    render(<LineupManager gameId="game-1" currentLineup={currentLineup()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Clear teams' }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/games/game-1/lineup',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            players: [
              { player_id: playerA, team: null, is_captain: false },
              { player_id: playerB, team: null, is_captain: false },
            ],
          }),
        })
      )
    })
    expect(refresh).toHaveBeenCalled()
  })
})
