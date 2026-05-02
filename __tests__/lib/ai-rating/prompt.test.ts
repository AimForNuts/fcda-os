import { describe, expect, it } from 'vitest'
import { buildAiRatingPrompt, sanitizeAiRatingSuggestion } from '@/lib/ai-rating/prompt'

describe('buildAiRatingPrompt', () => {
  it('formats a player with ratings and feedback', () => {
    const result = buildAiRatingPrompt([
      {
        player_id: 'abc-123',
        player_name: 'João',
        current_rating: 7.5,
        approved_ratings: [8, 6, 9],
        feedback_texts: ['Good game', 'Worked hard'],
      },
    ])
    expect(result).toBe(
      'João (id:abc-123) current rating: 7.5 unprocessed count: 3 average: 7.7 unprocessed ratings: 8 - 6 - 9 Feedback: Good game Worked hard'
    )
  })

  it('formats a player with no approved ratings', () => {
    const result = buildAiRatingPrompt([
      {
        player_id: 'def-456',
        player_name: 'Carlos',
        current_rating: 5,
        approved_ratings: [],
        feedback_texts: [],
      },
    ])
    expect(result).toBe(
      'Carlos (id:def-456) current rating: 5 unprocessed count: 0 average: (none) unprocessed ratings: (none)'
    )
  })

  it('formats a player with null current_rating as 0', () => {
    const result = buildAiRatingPrompt([
      {
        player_id: 'ghi-789',
        player_name: 'Pedro',
        current_rating: null,
        approved_ratings: [7],
        feedback_texts: [],
      },
    ])
    expect(result).toBe(
      'Pedro (id:ghi-789) current rating: 0 unprocessed count: 1 average: 7 unprocessed ratings: 7'
    )
  })

  it('joins multiple players with newlines', () => {
    const result = buildAiRatingPrompt([
      { player_id: 'a', player_name: 'Ana', current_rating: 8, approved_ratings: [9], feedback_texts: [] },
      { player_id: 'b', player_name: 'Bruno', current_rating: 6, approved_ratings: [], feedback_texts: [] },
    ])
    expect(result).toBe(
      'Ana (id:a) current rating: 8 unprocessed count: 1 average: 9 unprocessed ratings: 9\nBruno (id:b) current rating: 6 unprocessed count: 0 average: (none) unprocessed ratings: (none)'
    )
  })
})

describe('sanitizeAiRatingSuggestion', () => {
  it('does not allow low new ratings to increase the current rating', () => {
    expect(
      sanitizeAiRatingSuggestion({
        current_rating: 9,
        approved_ratings: [1],
        suggested_rating: 9.5,
      })
    ).toBe(9)
  })

  it('does not allow high new ratings to decrease the current rating', () => {
    expect(
      sanitizeAiRatingSuggestion({
        current_rating: 5,
        approved_ratings: [8],
        suggested_rating: 4.5,
      })
    ).toBe(5)
  })

  it('keeps players without unprocessed ratings unchanged', () => {
    expect(
      sanitizeAiRatingSuggestion({
        current_rating: 6.7,
        approved_ratings: [],
        suggested_rating: 9,
      })
    ).toBe(6.7)
  })

  it('rounds accepted suggestions to one decimal place', () => {
    expect(
      sanitizeAiRatingSuggestion({
        current_rating: 7,
        approved_ratings: [8],
        suggested_rating: 7.64,
      })
    ).toBe(7.6)
  })
})
