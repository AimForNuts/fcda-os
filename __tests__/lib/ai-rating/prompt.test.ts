import { describe, expect, it } from 'vitest'
import { buildAiRatingPrompt } from '@/lib/ai-rating/prompt'

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
      'João (id:abc-123) rating: 7.5 feedback ratings: 8 - 6 - 9 Feedback: Good game Worked hard'
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
      'Carlos (id:def-456) rating: 5 feedback ratings: (none)'
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
      'Pedro (id:ghi-789) rating: 0 feedback ratings: 7'
    )
  })

  it('joins multiple players with newlines', () => {
    const result = buildAiRatingPrompt([
      { player_id: 'a', player_name: 'Ana', current_rating: 8, approved_ratings: [9], feedback_texts: [] },
      { player_id: 'b', player_name: 'Bruno', current_rating: 6, approved_ratings: [], feedback_texts: [] },
    ])
    expect(result).toBe(
      'Ana (id:a) rating: 8 feedback ratings: 9\nBruno (id:b) rating: 6 feedback ratings: (none)'
    )
  })
})
