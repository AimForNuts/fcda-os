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
    render(<RatingForm gameId="game-1" teammates={teammates} existingRatings={{}} existingFeedbacks={{}} locked={false} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('pre-fills existing ratings', () => {
    render(
      <RatingForm
        gameId="game-1"
        teammates={teammates}
        existingRatings={{ 'player-1': 7.5 }}
        existingFeedbacks={{}}
        locked={false}
      />
    )
    const inputs = screen.getAllByRole('spinbutton')
    expect(inputs[0]).toHaveValue(7.5)
  })

  it('shows locked message and no inputs when locked is true', () => {
    render(<RatingForm gameId="game-1" teammates={teammates} existingRatings={{}} existingFeedbacks={{}} locked={true} />)
    expect(screen.getByText('matches.ratingLocked')).toBeInTheDocument()
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
  })

  it('shows existing ratings in locked table with toFixed(2) formatting', () => {
    render(
      <RatingForm
        gameId="game-1"
        teammates={teammates}
        existingRatings={{ 'player-1': 7.5 }}
        existingFeedbacks={{}}
        locked={true}
      />
    )
    expect(screen.getByText('7.50')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('submits ratings and shows confirmation on success', async () => {
    mockFetch.mockResolvedValue({ ok: true })
    render(<RatingForm gameId="game-1" teammates={teammates} existingRatings={{}} existingFeedbacks={{}} locked={false} />)

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
    render(<RatingForm gameId="game-1" teammates={teammates} existingRatings={{}} existingFeedbacks={{}} locked={false} />)

    fireEvent.click(screen.getByRole('button', { name: 'matches.ratingSubmit' }))

    await waitFor(() =>
      expect(screen.getByText('matches.errors.ratingFailed')).toBeInTheDocument()
    )
  })

  it('per-player textarea is disabled when that player has no rating', () => {
    render(
      <RatingForm
        gameId="game-1"
        teammates={teammates}
        existingRatings={{}}
        existingFeedbacks={{}}
        locked={false}
      />
    )
    const textareas = screen.getAllByRole('textbox')
    // Both textareas should be disabled when no ratings are filled
    expect(textareas[0]).toBeDisabled()
    expect(textareas[1]).toBeDisabled()
  })

  it('per-player textarea is enabled after its player gets a rating', () => {
    render(
      <RatingForm
        gameId="game-1"
        teammates={teammates}
        existingRatings={{}}
        existingFeedbacks={{}}
        locked={false}
      />
    )
    const inputs = screen.getAllByRole('spinbutton')
    fireEvent.change(inputs[0], { target: { value: '8' } })
    const textareas = screen.getAllByRole('textbox')
    expect(textareas[0]).not.toBeDisabled()
    // Second player still has no rating, so their textarea remains disabled
    expect(textareas[1]).toBeDisabled()
  })

  it('includes per-player feedbacks in the submitted payload', async () => {
    mockFetch.mockResolvedValue({ ok: true })
    render(
      <RatingForm
        gameId="game-1"
        teammates={teammates}
        existingRatings={{}}
        existingFeedbacks={{}}
        locked={false}
      />
    )
    const inputs = screen.getAllByRole('spinbutton')
    fireEvent.change(inputs[0], { target: { value: '8' } })

    const textareas = screen.getAllByRole('textbox')
    fireEvent.change(textareas[0], { target: { value: 'Great teamwork' } })

    fireEvent.click(screen.getByRole('button', { name: 'matches.ratingSubmit' }))

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"feedbacks"'),
        })
      )
    )
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('Great teamwork'),
        })
      )
    )
  })

  it('shows existing per-player feedback as read-only in locked view', () => {
    render(
      <RatingForm
        gameId="game-1"
        teammates={teammates}
        existingRatings={{ 'player-1': 7.5 }}
        existingFeedbacks={{ 'player-1': 'Great game' }}
        locked={true}
      />
    )
    expect(screen.getByText('Great game')).toBeInTheDocument()
  })

  it('pre-fills per-player feedback textareas with existingFeedbacks when not locked', () => {
    render(
      <RatingForm
        gameId="game-1"
        teammates={teammates}
        existingRatings={{ 'player-1': 7.5 }}
        existingFeedbacks={{ 'player-1': 'Previous feedback' }}
        locked={false}
      />
    )
    const textareas = screen.getAllByRole('textbox')
    expect(textareas[0]).toHaveValue('Previous feedback')
    expect(textareas[1]).toHaveValue('')
  })
})
