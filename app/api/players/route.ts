import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { fetchSessionContext, canAccessMod } from '@/lib/auth/permissions'
import { DEFAULT_NATIONALITY, normalizeNationality } from '@/lib/nationality'
import { signPlayerAvatarRecords } from '@/lib/players/avatar.server'
import { normaliseAlias } from '@/lib/whatsapp/parser'

const createPlayerSchema = z.object({
  sheet_name: z.string().min(1, 'Name is required').max(100),
  nationality: z.string().trim().length(2).optional(),
  // raw name used for alias creation (defaults to sheet_name if omitted)
  alias_display: z.string().optional(),
})

export async function GET(request: Request) {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })
  if (!canAccessMod(session.roles)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''

  if (!q) return Response.json([])

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .rpc('search_players', { q }) as {
      data: Array<{
        id: string
        sheet_name: string
        shirt_number: number | null
        nationality: string
        avatar_path: string | null
      }> | null
      error: unknown
    }

  if (error) return Response.json({ error: 'Search failed' }, { status: 500 })

  return Response.json(await signPlayerAvatarRecords(data ?? [], session.profile.approved))
}

export async function POST(request: Request) {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })
  if (!canAccessMod(session.roles)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const parsed = createPlayerSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: player, error: playerErr } = await (supabase as any).from('players')
    .insert({
      sheet_name: parsed.data.sheet_name,
      nationality: normalizeNationality(parsed.data.nationality ?? DEFAULT_NATIONALITY),
    })
    .select('id, sheet_name, nationality')
    .single() as { data: { id: string; sheet_name: string; nationality: string } | null; error: unknown }

  if (playerErr || !player) {
    return Response.json({ error: 'Failed to create player' }, { status: 500 })
  }

  const aliasDisplay = parsed.data.alias_display ?? parsed.data.sheet_name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('player_aliases').insert({
    player_id: player.id,
    alias: normaliseAlias(aliasDisplay),
    alias_display: aliasDisplay,
  })

  const admin = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: auditErr } = await (admin as any).from('audit_log').insert({
    action: 'player.created_guest',
    performed_by: session.userId,
    target_id: player.id,
    target_type: 'player',
    metadata: { sheet_name: player.sheet_name },
  })
  if (auditErr) console.error('audit_log insert failed', auditErr)

  return Response.json(
    { id: player.id, sheet_name: player.sheet_name, nationality: player.nationality },
    { status: 201 }
  )
}
