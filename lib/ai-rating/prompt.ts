export type PlayerForPrompt = {
  player_id: string
  player_name: string
  current_rating: number | null
  approved_ratings: number[]
  feedback_texts: string[]
}

type SanitizeSuggestionInput = {
  current_rating: number | null
  approved_ratings: number[]
  suggested_rating: number | undefined
}

export function buildAiRatingPrompt(players: PlayerForPrompt[]): string {
  return players
    .map((p) => {
      const current = p.current_rating ?? 0
      const average =
        p.approved_ratings.length > 0
          ? roundToOneDecimal(
              p.approved_ratings.reduce((sum, rating) => sum + rating, 0) /
                p.approved_ratings.length
            )
          : null
      const ratingsStr =
        p.approved_ratings.length > 0 ? p.approved_ratings.join(' - ') : '(none)'
      const statsPart =
        average == null
          ? 'unprocessed count: 0 average: (none)'
          : `unprocessed count: ${p.approved_ratings.length} average: ${average}`
      const feedbackPart =
        p.feedback_texts.length > 0 ? ` Feedback: ${p.feedback_texts.join(' ')}` : ''
      return `${p.player_name} (id:${p.player_id}) current rating: ${current} ${statsPart} unprocessed ratings: ${ratingsStr}${feedbackPart}`
    })
    .join('\n')
}

export function sanitizeAiRatingSuggestion({
  current_rating,
  approved_ratings,
  suggested_rating,
}: SanitizeSuggestionInput): number {
  const current = clampRating(current_rating ?? 0)

  if (approved_ratings.length === 0 || suggested_rating == null) {
    return current
  }

  const suggested = clampRating(suggested_rating)
  const average =
    approved_ratings.reduce((sum, rating) => sum + rating, 0) / approved_ratings.length

  if (average < current && suggested > current) return current
  if (average > current && suggested < current) return current
  if (average === current) return current

  return suggested
}

function clampRating(rating: number): number {
  return Math.min(10, Math.max(0, roundToOneDecimal(rating)))
}

function roundToOneDecimal(rating: number): number {
  return Math.round(rating * 10) / 10
}
