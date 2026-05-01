import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ResetTeamsButton } from '@/components/matches/ResetTeamsButton'

const refresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('ResetTeamsButton', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    refresh.mockReset()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('clears team and captain fields while preserving players', async () => {
    mockFetch.mockResolvedValue({ ok: true })

    render(<ResetTeamsButton gameId="game-1" playerIds={['player-1', 'player-2']} />)
    fireEvent.click(screen.getByRole('button', { name: 'Limpar equipas' }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/games/game-1/lineup',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            players: [
              { player_id: 'player-1', team: null, is_captain: false },
              { player_id: 'player-2', team: null, is_captain: false },
            ],
          }),
        })
      )
    })
    expect(refresh).toHaveBeenCalled()
  })

  it('does not reset when confirmation is cancelled', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(<ResetTeamsButton gameId="game-1" playerIds={['player-1']} />)
    fireEvent.click(screen.getByRole('button', { name: 'Limpar equipas' }))

    expect(mockFetch).not.toHaveBeenCalled()
  })
})
