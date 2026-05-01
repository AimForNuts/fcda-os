import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NewGameModal } from '@/components/matches/NewGameModal'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('NewGameModal', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    push.mockReset()
  })

  it('opens the modal and creates a game', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'game-1' }),
    })

    render(<NewGameModal />)

    fireEvent.click(screen.getByRole('button', { name: 'mod.newGame' }))
    expect(screen.getByRole('dialog', { name: 'mod.newGame' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('mod.date'), {
      target: { value: '2026-05-03T11:00' },
    })
    fireEvent.change(screen.getByLabelText('mod.location'), {
      target: { value: 'Arca de Água, Porto' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'mod.createGame' }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/games',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: new Date('2026-05-03T11:00').toISOString(),
            location: 'Arca de Água, Porto',
            counts_for_stats: true,
          }),
        }),
      )
    })
    expect(push).toHaveBeenCalledWith('/mod/games/game-1/lineup')
  })

  it('shows an error when creation fails', async () => {
    mockFetch.mockResolvedValue({ ok: false })

    render(<NewGameModal />)

    fireEvent.click(screen.getByRole('button', { name: 'mod.newGame' }))
    fireEvent.change(screen.getByLabelText('mod.date'), {
      target: { value: '2026-05-03T11:00' },
    })
    fireEvent.change(screen.getByLabelText('mod.location'), {
      target: { value: 'Arca de Água, Porto' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'mod.createGame' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('mod.game.errorCreate')
    expect(push).not.toHaveBeenCalled()
  })
})
