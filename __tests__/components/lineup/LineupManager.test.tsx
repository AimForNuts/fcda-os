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
        'mod.lineup.playerColumn': 'Player',
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

describe('LineupManager', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    refresh.mockReset()
    push.mockReset()
  })

  it('changes the captain for a team and saves captain flags', async () => {
    mockFetch.mockResolvedValue({ ok: true })

    render(
      <LineupManager
        gameId="game-1"
        currentLineup={[
          {
            player_id: '11111111-1111-4111-8111-111111111111',
            sheet_name: 'Carlos',
            shirt_number: 10,
            avatar_url: null,
            team: 'a',
            is_captain: true,
          },
          {
            player_id: '22222222-2222-4222-8222-222222222222',
            sheet_name: 'João',
            shirt_number: 5,
            avatar_url: null,
            team: 'a',
            is_captain: false,
          },
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
                player_id: '11111111-1111-4111-8111-111111111111',
                team: 'a',
                is_captain: false,
              },
              {
                player_id: '22222222-2222-4222-8222-222222222222',
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
        currentLineup={[
          {
            player_id: '11111111-1111-4111-8111-111111111111',
            sheet_name: 'Carlos',
            shirt_number: 10,
            avatar_url: null,
            team: 'a',
            is_captain: true,
          },
          {
            player_id: '22222222-2222-4222-8222-222222222222',
            sheet_name: 'João',
            shirt_number: 5,
            avatar_url: null,
            team: 'b',
            is_captain: true,
          },
        ]}
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
                player_id: '11111111-1111-4111-8111-111111111111',
                team: 'b',
                is_captain: true,
              },
              {
                player_id: '22222222-2222-4222-8222-222222222222',
                team: 'b',
                is_captain: false,
              },
            ],
          }),
        })
      )
    })
  })
})
