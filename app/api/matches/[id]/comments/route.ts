import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { fetchSessionContext } from '@/lib/auth/permissions'
import { extractMentionUserIds } from '@/lib/matches/comments'
import { signPlayerAvatarRecords } from '@/lib/players/avatar.server'

const schema = z.object({
  content: z.string().trim().min(1).max(2000),
  mentionUserIds: z.array(z.string().uuid()).max(30).optional(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  const { id: gameId } = await params
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const supabase = await createClient()

  const { data: game } = await supabase
    .from('games')
    .select('id')
    .eq('id', gameId)
    .single() as { data: { id: string } | null; error: unknown }

  if (!game) return Response.json({ error: 'Not found' }, { status: 404 })

  const requestedMentionUserIds = parsed.data.mentionUserIds ?? []
  let users: Array<{ id: string; display_name: string }> = []

  if (requestedMentionUserIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', requestedMentionUserIds) as {
        data: Array<{ id: string; display_name: string }> | null
        error: unknown
      }
    users = data ?? []
  }

  const mentionUserIds = extractMentionUserIds(parsed.data.content, users)

  const { data: comment, error } = await supabase
    .from('match_comments')
    .insert({
      game_id: gameId,
      author_id: session.userId,
      content: parsed.data.content,
      mention_user_ids: mentionUserIds,
    })
    .select('id, game_id, author_id, content, mention_user_ids, created_at, profiles:author_id(display_name)')
    .single() as {
      data: {
        id: string
        game_id: string
        author_id: string
        content: string
        mention_user_ids: string[]
        created_at: string
        profiles: { display_name: string } | null
      } | null
      error: unknown
    }

  if (error || !comment) {
    console.error('match comment insert failed', error)
    return Response.json({ error: 'Failed to comment' }, { status: 500 })
  }

  let authorAvatarUrl: string | null = null
  if (session.profile.approved) {
    const { data: authorPlayers } = await supabase
      .from('players')
      .select('profile_id, avatar_path')
      .eq('profile_id', session.userId) as {
        data: Array<{ profile_id: string | null; avatar_path: string | null }> | null
        error: unknown
      }
    const [authorPlayer] = await signPlayerAvatarRecords(authorPlayers ?? [], true)
    authorAvatarUrl = authorPlayer?.avatar_url ?? null
  }

  return Response.json({
    id: comment.id,
    author_id: comment.author_id,
    author_name: comment.profiles?.display_name ?? session.profile.display_name,
    author_avatar_url: authorAvatarUrl,
    content: comment.content,
    mention_user_ids: comment.mention_user_ids,
    created_at: comment.created_at,
  })
}
