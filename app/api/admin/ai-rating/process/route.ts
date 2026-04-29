import OpenAI from 'openai'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchSessionContext, canAccessAdmin } from '@/lib/auth/permissions'
import { buildAiRatingPrompt } from '@/lib/ai-rating/prompt'

const SYSTEM_PROMPT = `You are a football coach assistant. Given each player's current rating and their recent match ratings with optional feedback text, suggest a new overall rating between 0 and 10 (one decimal place). Consider both the numeric ratings and any feedback text. For players with no new ratings, keep their current rating unchanged. Respond ONLY with a valid JSON object in this exact format, no explanations:
{"ratings": [{"player_id": "...", "suggested_rating": 7.5}]}`

export async function POST() {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })
  if (!canAccessAdmin(session.roles)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createServiceClient()

  const { data: players } = await admin
    .from('players')
    .select('id, sheet_name, current_rating')
    .order('sheet_name') as {
      data: Array<{ id: string; sheet_name: string; current_rating: number | null }> | null
      error: unknown
    }

  if (!players || players.length === 0) {
    return Response.json({ players: [] })
  }

  const playerIds = players.map((p) => p.id)

  const { data: submissions } = await admin
    .from('rating_submissions')
    .select('rated_player_id, rating, feedback')
    .in('rated_player_id', playerIds)
    .eq('status', 'approved') as {
      data: Array<{ rated_player_id: string; rating: number; feedback: string | null }> | null
      error: unknown
    }

  const submissionsByPlayer = new Map<string, { ratings: number[]; feedbacks: string[] }>()
  for (const s of submissions ?? []) {
    if (!submissionsByPlayer.has(s.rated_player_id)) {
      submissionsByPlayer.set(s.rated_player_id, { ratings: [], feedbacks: [] })
    }
    const entry = submissionsByPlayer.get(s.rated_player_id)!
    entry.ratings.push(s.rating)
    if (s.feedback) entry.feedbacks.push(s.feedback)
  }

  const promptPlayers = players.map((p) => ({
    player_id: p.id,
    player_name: p.sheet_name,
    current_rating: p.current_rating,
    approved_ratings: submissionsByPlayer.get(p.id)?.ratings ?? [],
    feedback_texts: submissionsByPlayer.get(p.id)?.feedbacks ?? [],
  }))

  const prompt = buildAiRatingPrompt(promptPlayers)

  const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY })
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
  })

  const raw = completion.choices[0].message.content ?? '{}'
  let ratings: Array<{ player_id: string; suggested_rating: number }> = []
  try {
    const parsed = JSON.parse(raw)
    ratings = parsed.ratings ?? []
  } catch {
    return Response.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }

  const ratingMap = new Map(ratings.map((r) => [r.player_id, r.suggested_rating]))

  const result = players.map((p) => ({
    player_id: p.id,
    player_name: p.sheet_name,
    current_rating: p.current_rating,
    suggested_rating: ratingMap.get(p.id) ?? p.current_rating ?? 0,
    pending_count: submissionsByPlayer.get(p.id)?.ratings.length ?? 0,
  }))

  return Response.json({ players: result })
}
