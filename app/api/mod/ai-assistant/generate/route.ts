import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { z } from 'zod'
import { fetchSessionContext, canAccessMod } from '@/lib/auth/permissions'

const SYSTEM_PROMPT = `You are a weekly futsal team balancer.

Your job is to generate two balanced teams from the player list provided.

Use this exact method:

1. Data source and extraction
- Use the player ratings table provided as the current source of truth.
- For every player, extract: Current Rating, Preferred Positions, Last Feedback / Status Summary.
- If win % data is provided, use it as an extra balancing signal.
- If a player has rating 0 or is marked unrated, ask for a temporary rating only if necessary.

2. Balancing algorithm
Apply these rules in order:

Rule 1: Anchor distribution
- Sort players by Rating from highest to lowest.
- Split the top 2 (or top 4 if needed) across both teams so one team does not stack the strongest players.

Rule 2: Total rating parity
- Distribute remaining players so the total sum of ratings is as close as mathematically possible.

Rule 3: Win % compensation
- If rating balance is close but not perfect, use higher win % players to strengthen the slightly weaker-rated team.

Rule 4: Position balance
- Distribute positions evenly. Avoid leaving one team without defensive structure, midfield control, or attacking threat.

Rule 5: Feedback balance
- Use feedback to avoid bad combinations. Balance volatility, defensive weakness, and high-impact players.

Rule 6: Equal playtime weighting
- Assume strict equal-time rotation. Evaluate using the full aggregate of all players on each side.

3. Constraint overrides
- Apply manual constraints first (e.g. "Player X must be on Team White", "Players A and B must be separated").
- Balance around them after locking constraints.

4. Output
- Return each player's player_id in the correct team array.
- team_a = Team White (Equipa Branca), team_b = Team Black (Equipa Preta).
- Optionally include 1-3 short notes (typo corrections, temporary ratings used, constraints applied).

5. Behavior rules
- Do not ask unnecessary follow-up questions.
- Always prioritize balanced, playable teams over purely mathematical symmetry.`

const TeamsSchema = z.object({
  team_a: z.array(z.string()).describe('player_ids for Team White (Equipa Branca)'),
  team_b: z.array(z.string()).describe('player_ids for Team Black (Equipa Preta)'),
  notes: z.string().optional().describe('1-3 short lines only if needed'),
})

type PlayerEntry = {
  id: string
  sheet_name: string
  current_rating: number | null
  preferred_positions: string[]
  last3Ratings: number[]
  totalGames: number
  winPct: number | null
  recentFeedback: string[]
}

function buildPlayerTable(players: PlayerEntry[]): string {
  const lines = players.map((p) => {
    const rating = p.current_rating != null && p.current_rating > 0 ? p.current_rating.toFixed(1) : 'unrated'
    const pos = p.preferred_positions.length > 0 ? p.preferred_positions.join(', ') : 'no position'
    const last3 = p.last3Ratings.length > 0 ? p.last3Ratings.map((r) => r.toFixed(1)).join(' / ') : '-'
    const games = p.totalGames > 0 ? `${p.totalGames} (Win: ${p.winPct}%)` : '0'
    const feedback = p.recentFeedback.length > 0 ? p.recentFeedback.map((f) => `"${f}"`).join(' ') : '-'
    return `- ${p.sheet_name} (player_id: ${p.id}) | Rating: ${rating} | Positions: ${pos} | Last 3: ${last3} | Games: ${games} | Feedback: ${feedback}`
  })
  return `Current player ratings table:\n${lines.join('\n')}`
}

export async function POST(request: Request) {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })
  if (!canAccessMod(session.roles)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null)
  if (!body?.players || !Array.isArray(body.players)) {
    return Response.json({ error: 'Missing players array' }, { status: 400 })
  }

  const players: PlayerEntry[] = body.players
  if (players.length === 0) return Response.json({ error: 'No players provided' }, { status: 400 })

  const playerTable = buildPlayerTable(players)
  const userMessage = `Generate teams for this week's game. Do not ask for more information — all player data is provided below.\n\n${playerTable}`

  const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY })
  try {
    const completion = await openai.chat.completions.parse({
      model: 'gpt-5.4-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      response_format: zodResponseFormat(TeamsSchema, 'teams'),
    } as any)

    const parsed = completion.choices[0].message.parsed
    if (!parsed) return Response.json({ error: 'AI returned no result' }, { status: 500 })

    return Response.json(parsed)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ error: `Failed to contact AI: ${message}` }, { status: 500 })
  }
}
