import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DeleteGameButton } from '@/components/matches/DeleteGameButton'

const push = vi.fn()
const refresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('DeleteGameButton', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    push.mockReset()
    refresh.mockReset()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('deletes the game and returns to the matches list', async () => {
    mockFetch.mockResolvedValue({ ok: true })

    render(<DeleteGameButton gameId="game-1" />)
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar jogo' }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/games/game-1', { method: 'DELETE' })
    })
    expect(push).toHaveBeenCalledWith('/matches')
    expect(refresh).toHaveBeenCalled()
  })

  it('does not delete when confirmation is cancelled', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(<DeleteGameButton gameId="game-1" />)
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar jogo' }))

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('shows the server error when deletion fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Only open games can be deleted' }),
    })

    render(<DeleteGameButton gameId="game-1" />)
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar jogo' }))

    expect(await screen.findByText('Only open games can be deleted')).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })
})
