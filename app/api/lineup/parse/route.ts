import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { fetchSessionContext, canAccessMod } from '@/lib/auth/permissions'
import { signPlayerAvatarRecords } from '@/lib/players/avatar.server'
import { normaliseAlias, extractNames } from '@/lib/whatsapp/parser'
import type { ParsedEntry } from '@/lib/whatsapp/parser'

const parseSchema = z.object({
  text: z.string().min(1, 'Text is required'),
})

export async function POST(request: Request) {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })
  if (!canAccessMod(session.roles)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const parsed = parseSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const names = extractNames(parsed.data.text)
  if (names.length === 0) return Response.json([])

  const normalisedNames = names.map(normaliseAlias)

  const supabase = await createClient()

  // Batch-fetch all matching aliases
  const { data: aliasRows, error: aliasErr } = await supabase
    .from('player_aliases')
    .select('alias, player_id')
    .in('alias', normalisedNames) as { data: Array<{ alias: string; player_id: string }> | null; error: unknown }

  if (aliasErr) return Response.json({ error: 'DB error' }, { status: 500 })

  // Fetch player details for all matched IDs
  const matchedPlayerIds = [...new Set((aliasRows ?? []).map((r) => r.player_id))]
  const playerMap = new Map<
    string,
    {
      id: string
      sheet_name: string
      shirt_number: number | null
      avatar_url: string | null
    }
  >()

  if (matchedPlayerIds.length > 0) {
    const { data: players } = await supabase
      .from('players')
      .select('id, sheet_name, shirt_number, avatar_path')
      .in('id', matchedPlayerIds) as {
        data: Array<{
          id: string
          sheet_name: string
          shirt_number: number | null
          avatar_path: string | null
        }> | null
        error: unknown
      }

    for (const p of await signPlayerAvatarRecords(players ?? [], session.profile.approved)) {
      playerMap.set(p.id, p)
    }
  }

  // Build a lookup: normalised alias → player_id[]
  const aliasToPlayerIds = new Map<string, string[]>()
  for (const row of aliasRows ?? []) {
    const existing = aliasToPlayerIds.get(row.alias) ?? []
    if (!existing.includes(row.player_id)) {
      aliasToPlayerIds.set(row.alias, [...existing, row.player_id])
    }
  }

  // Build result: one entry per extracted name
  const entries: ParsedEntry[] = names.map((raw, i) => {
    const norm = normalisedNames[i]
    const playerIds = aliasToPlayerIds.get(norm) ?? []
    const matches = playerIds
      .map((pid) => playerMap.get(pid))
      .filter((p): p is {
        id: string
        sheet_name: string
        shirt_number: number | null
        avatar_url: string | null
      } => p != null)

    let status: ParsedEntry['status']
    if (matches.length === 0) status = 'unmatched'
    else if (matches.length === 1) status = 'matched'
    else status = 'ambiguous'

    return { raw, normalised: norm, status, matches }
  })

  return Response.json(entries)
}
