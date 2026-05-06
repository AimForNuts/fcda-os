import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NewGameModal } from '@/components/matches/NewGameModal'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => {
      const map: Record<string, string> = {
        'matches.gameType.competitive': 'Competitivo',
        'matches.gameType.friendly': 'Amigável',
        'mod.gameType': 'Tipo de jogo',
        'mod.gameTypeCompetitiveDescription': 'Conta para estatísticas e leaderboard.',
        'mod.gameTypeFriendlyDescription': 'Não altera estatísticas oficiais.',
      }
      return map[k] ?? k
    },
  }),
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

  it('reuses a recent recinto when selected from the dropdown', async () => {
    const recintoId = '11111111-1111-4111-8111-111111111111'
    mockFetch.mockImplementation(async (url: string) => {
      if (url === '/api/recintos') {
        return {
          ok: true,
          json: async () => ({
            recintos: [
              {
                id: recintoId,
                name: 'Arca de Água',
                formatted_address: 'Porto',
                google_place_id: 'place-1',
              },
            ],
          }),
        }
      }

      return {
        ok: true,
        json: async () => ({ id: 'game-1' }),
      }
    })

    render(<NewGameModal />)

    fireEvent.click(screen.getByRole('button', { name: 'mod.newGame' }))
    fireEvent.change(screen.getByLabelText('mod.date'), {
      target: { value: '2026-05-03T11:00' },
    })
    fireEvent.focus(screen.getByLabelText('mod.location'))
    fireEvent.click(await screen.findByRole('button', { name: /Arca de Água/i }))
    await waitFor(() => {
      expect(screen.getByLabelText('mod.location')).toHaveValue('Arca de Água')
    })
    fireEvent.click(screen.getByRole('button', { name: 'mod.createGame' }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/games',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            date: new Date('2026-05-03T11:00').toISOString(),
            location: 'Arca de Água',
            counts_for_stats: true,
            recinto_id: recintoId,
          }),
        }),
      )
    })
  })

  it('creates a friendly game when Amigável is selected', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'game-1' }),
    })

    render(<NewGameModal />)

    fireEvent.click(screen.getByRole('button', { name: 'mod.newGame' }))
    fireEvent.change(screen.getByLabelText('mod.date'), {
      target: { value: '2026-05-03T11:00' },
    })
    fireEvent.change(screen.getByLabelText('mod.location'), {
      target: { value: 'Arca de Água, Porto' },
    })
    fireEvent.click(screen.getByRole('radio', { name: /Amigável/i }))
    fireEvent.click(screen.getByRole('button', { name: 'mod.createGame' }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/games',
        expect.objectContaining({
          body: JSON.stringify({
            date: new Date('2026-05-03T11:00').toISOString(),
            location: 'Arca de Água, Porto',
            counts_for_stats: false,
          }),
        }),
      )
    })
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
