export type PlayerForPrompt = {
  player_id: string
  player_name: string
  current_rating: number | null
  approved_ratings: number[]
  feedback_texts: string[]
}

export function buildAiRatingPrompt(players: PlayerForPrompt[]): string {
  return players
    .map((p) => {
      const current = p.current_rating ?? 0
      const ratingsStr =
        p.approved_ratings.length > 0 ? p.approved_ratings.join(' - ') : '(none)'
      const feedbackPart =
        p.feedback_texts.length > 0 ? ` Feedback: ${p.feedback_texts.join(' ')}` : ''
      return `${p.player_name} (id:${p.player_id}) rating: ${current} feedback ratings: ${ratingsStr}${feedbackPart}`
    })
    .join('\n')
}
