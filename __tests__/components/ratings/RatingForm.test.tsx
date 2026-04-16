import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RatingForm } from '@/components/ratings/RatingForm'
import type { PlayerPublic } from '@/types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

const teammates: PlayerPublic[] = [
  { id: 'player-1', display_name: 'Alice', shirt_number: 1, current_rating: null, profile_id: null },
  { id: 'player-2', display_name: 'Bob', shirt_number: 2, current_rating: null, profile_id: null },
]

describe('RatingForm', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('renders a row per teammate', () => {
    render(<RatingForm gameId="game-1" teammates={teammates} existingRatings={{}} locked={false} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('pre-fills existing ratings', () => {
    render(
      <RatingForm
        gameId="game-1"
        teammates={teammates}
        existingRatings={{ 'player-1': 7.5 }}
        locked={false}
      />
    )
    const inputs = screen.getAllByRole('spinbutton')
    expect(inputs[0]).toHaveValue(7.5)
  })

  it('shows locked message and no inputs when locked is true', () => {
    render(<RatingForm gameId="game-1" teammates={teammates} existingRatings={{}} locked={true} />)
    expect(screen.getByText('matches.ratingLocked')).toBeInTheDocument()
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
  })

  it('shows existing ratings in locked table with toFixed(2) formatting', () => {
    render(
      <RatingForm
        gameId="game-1"
        teammates={teammates}
        existingRatings={{ 'player-1': 7.5 }}
        locked={true}
      />
    )
    expect(screen.getByText('7.50')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('submits ratings and shows confirmation on success', async () => {
    mockFetch.mockResolvedValue({ ok: true })
    render(<RatingForm gameId="game-1" teammates={teammates} existingRatings={{}} locked={false} />)

    const inputs = screen.getAllByRole('spinbutton')
    fireEvent.change(inputs[0], { target: { value: '8' } })
    fireEvent.change(inputs[1], { target: { value: '7' } })

    fireEvent.click(screen.getByRole('button', { name: 'matches.ratingSubmit' }))

    await waitFor(() =>
      expect(screen.getByText('matches.ratingSubmitted')).toBeInTheDocument()
    )
  })

  it('shows error message on failed submission', async () => {
    mockFetch.mockResolvedValue({ ok: false })
    render(<RatingForm gameId="game-1" teammates={teammates} existingRatings={{}} locked={false} />)

    fireEvent.click(screen.getByRole('button', { name: 'matches.ratingSubmit' }))

    await waitFor(() =>
      expect(screen.getByText('matches.errors.ratingFailed')).toBeInTheDocument()
    )
  })
})
