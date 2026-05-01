import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { fetchSessionContext } from '@/lib/auth/permissions'
import { extractMentionUserIds } from '@/lib/matches/comments'
import { signPlayerAvatarRecords } from '@/lib/players/avatar.server'

const updateSchema = z.object({
  content: z.string().trim().min(1).max(2000),
  mentionUserIds: z.array(z.string().uuid()).max(30).optional(),
})

async function resolveMentionUserIds(
  content: string,
  requestedMentionUserIds: string[],
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  if (requestedMentionUserIds.length === 0) {
    return []
  }

  const { data } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', requestedMentionUserIds) as {
      data: Array<{ id: string; display_name: string }> | null
      error: unknown
    }

  return extractMentionUserIds(content, data ?? [])
}

async function resolveAuthorAvatarUrl(userId: string, canView: boolean) {
  if (!canView) return null

  const supabase = await createClient()
  const { data: authorPlayers } = await supabase
    .from('players')
    .select('profile_id, avatar_path')
    .eq('profile_id', userId) as {
      data: Array<{ profile_id: string | null; avatar_path: string | null }> | null
      error: unknown
    }

  const [authorPlayer] = await signPlayerAvatarRecords(authorPlayers ?? [], true)
  return authorPlayer?.avatar_url ?? null
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  const { id: gameId, commentId } = await params
  const body = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('match_comments')
    .select('id, author_id')
    .eq('id', commentId)
    .eq('game_id', gameId)
    .single() as { data: { id: string; author_id: string } | null; error: unknown }

  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })
  if (existing.author_id !== session.userId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const mentionUserIds = await resolveMentionUserIds(
    parsed.data.content,
    parsed.data.mentionUserIds ?? [],
    supabase
  )

  const { data: comment, error } = await supabase
    .from('match_comments')
    .update({
      content: parsed.data.content,
      mention_user_ids: mentionUserIds,
      updated_at: new Date().toISOString(),
    })
    .eq('id', commentId)
    .eq('game_id', gameId)
    .eq('author_id', session.userId)
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
    console.error('match comment update failed', error)
    return Response.json({ error: 'Failed to update comment' }, { status: 500 })
  }

  return Response.json({
    id: comment.id,
    author_id: comment.author_id,
    author_name: comment.profiles?.display_name ?? session.profile.display_name,
    author_avatar_url: await resolveAuthorAvatarUrl(session.userId, session.profile.approved),
    content: comment.content,
    mention_user_ids: comment.mention_user_ids,
    created_at: comment.created_at,
  })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  const { id: gameId, commentId } = await params
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('match_comments')
    .select('id, author_id')
    .eq('id', commentId)
    .eq('game_id', gameId)
    .single() as { data: { id: string; author_id: string } | null; error: unknown }

  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })
  if (existing.author_id !== session.userId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase
    .from('match_comments')
    .delete()
    .eq('id', commentId)
    .eq('game_id', gameId)
    .eq('author_id', session.userId)

  if (error) {
    console.error('match comment delete failed', error)
    return Response.json({ error: 'Failed to delete comment' }, { status: 500 })
  }

  return Response.json({ ok: true, id: commentId })
}
