import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { UserTable } from '@/app/(admin)/admin/users/UserTable'
import type { UserRow } from '@/app/(admin)/admin/users/page'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'admin.addAlias': 'Add alias',
        'admin.addPlayerFeedback': 'Add feedback',
        'admin.actions': 'Actions',
        'admin.approved': 'Approved',
        'admin.closeItem': 'Close',
        'admin.details': 'Details',
        'admin.displayName': 'Display name',
        'admin.email': 'Email',
        'admin.feedbackComment': 'Comment',
        'admin.feedbackGame': 'Game',
        'admin.linkPlayer': 'Link player',
        'admin.noFeedbackGames': 'No eligible finished games for this player.',
        'admin.noLinkedPlayer': 'No player is linked to this user.',
        'admin.noPlayer': '-',
        'admin.noEmail': 'No email',
        'admin.pending': 'Pending',
        'admin.playerDetails': 'Player details',
        'admin.saveEdit': 'Save',
        'admin.searchPlayer': 'Search player...',
        'admin.searchUsers': 'Search users...',
        'admin.tabs.account': 'Account',
        'admin.tabs.feedback': 'Feedback',
        'admin.tabs.player': 'Player',
        'common.cancel': 'Cancel',
        'matches.ratingSubmit': 'Submit ratings',
      }
      return map[key] ?? key
    },
  }),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

const user: UserRow = {
  id: '11111111-1111-4111-8111-111111111111',
  display_name: 'Andre User',
  email: 'andre@example.com',
  approved: true,
  roles: ['player'],
  player: {
    id: '22222222-2222-4222-8222-222222222222',
    sheet_name: 'Andre',
    shirt_number: 10,
    current_rating: 7.5,
    preferred_positions: ['CM'],
    avatar_url: null,
    aliases: [],
    feedback_games: [],
  },
}

describe('Admin UserTable details modal', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('shows email and updates account display name from the account tab', async () => {
    mockFetch.mockResolvedValue({ ok: true })

    render(<UserTable users={[user]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Actions' }))
    expect(screen.getByLabelText('Email')).toHaveValue('andre@example.com')

    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Andre Admin' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/admin/users/${user.id}`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ display_name: 'Andre Admin' }),
        })
      )
    })
  })

  it('updates linked player details from the user modal', async () => {
    mockFetch.mockResolvedValue({ ok: true })

    render(<UserTable users={[user]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Actions' }))
    expect(screen.getByRole('dialog', { name: 'Player details' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Player' }))
    fireEvent.change(screen.getByLabelText('Nome de jogador'), { target: { value: 'Joao' } })
    fireEvent.change(screen.getByLabelText('Número'), { target: { value: '9' } })
    fireEvent.change(screen.getByLabelText('Rating'), { target: { value: '8.25' } })
    fireEvent.click(screen.getByRole('button', { name: 'ST' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/admin/players/${user.player!.id}`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            sheet_name: 'Joao',
            shirt_number: 9,
            preferred_positions: ['CM', 'ST'],
            current_rating: 8.25,
          }),
        })
      )
    })
  })
})
