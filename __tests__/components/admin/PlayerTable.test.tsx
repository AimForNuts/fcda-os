import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PlayerTable } from '@/app/(admin)/admin/players/PlayerTable'
import type { PlayerRow } from '@/app/(admin)/admin/players/page'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'admin.addPlayerFeedback': 'Add feedback',
        'admin.cancelEdit': 'Cancel',
        'admin.closeItem': 'Close',
        'admin.feedbackComment': 'Comment',
        'admin.feedbackGame': 'Game',
        'admin.guest': 'Guest',
        'admin.noPlayersFound': 'No players found.',
        'admin.playerFeedbackSubmitted': 'Feedback submitted.',
        'admin.searchPlayers': 'Search players...',
        'matches.ratingSubmit': 'Submit ratings',
        'matches.ratingSubmitting': 'Submitting...',
        'common.cancel': 'Cancel',
      }
      return map[key] ?? key
    },
  }),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

const player: PlayerRow = {
  id: '11111111-1111-4111-8111-111111111111',
  sheet_name: 'André',
  shirt_number: 10,
  nationality: 'PT',
  current_rating: 7.5,
  preferred_positions: ['CM'],
  profile_id: null,
  profile_name: null,
  avatar_url: null,
  aliases: [],
  feedback_games: [
    {
      id: '22222222-2222-4222-8222-222222222222',
      date: '2026-04-20T20:00:00Z',
      location: 'Arca d Agua',
    },
  ],
}

describe('Admin PlayerTable feedback modal', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('submits admin feedback for the selected player and game', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })

    render(<PlayerTable players={[player]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Add feedback' }))
    expect(screen.getByRole('dialog', { name: 'Add feedback' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Nota (0-10)'), { target: { value: '8.25' } })
    fireEvent.change(screen.getByLabelText('Comment'), { target: { value: 'Strong positioning' } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit ratings' }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/admin/players/${player.id}/feedback`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            game_id: player.feedback_games[0].id,
            rating: 8.25,
            feedback: 'Strong positioning',
          }),
        })
      )
    })
    expect(await screen.findByText('Feedback submitted.')).toBeInTheDocument()
  })
})
