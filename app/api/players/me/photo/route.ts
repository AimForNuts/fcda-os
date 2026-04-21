import { fetchSessionContext } from '@/lib/auth/permissions'
import {
  removePlayerAvatar,
  signPlayerAvatarPath,
  uploadPlayerAvatar,
} from '@/lib/players/avatar.server'
import { validatePlayerAvatarFile } from '@/lib/players/avatar'
import { createServiceClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

async function resolveLinkedPlayer(userId: string) {
  const admin = createServiceClient()
  const { data: player, error } = await admin
    .from('players')
    .select('id, avatar_path')
    .eq('profile_id', userId)
    .maybeSingle() as {
      data: { id: string; avatar_path: string | null } | null
      error: unknown
    }

  return { admin, player, error }
}

export async function POST(request: Request) {
  const session = await fetchSessionContext()
  if (!session) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 })
  }

  if (!session.profile.approved) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { admin, player, error } = await resolveLinkedPlayer(session.userId)
  if (error) {
    return Response.json({ error: 'Failed to resolve player' }, { status: 500 })
  }

  if (!player) {
    return Response.json({ error: 'No linked player' }, { status: 404 })
  }

  const formData = await request.formData().catch(() => null)
  const maybeFile = formData?.get('file')
  const file = maybeFile instanceof File ? maybeFile : null
  const validationError = validatePlayerAvatarFile(file)
  if (validationError) {
    return Response.json({ error: validationError }, { status: 422 })
  }

  const { avatarPath, error: uploadError } = await uploadPlayerAvatar(player.id, file)
  if (uploadError || !avatarPath) {
    return Response.json({ error: 'Failed to upload photo' }, { status: 500 })
  }

  const avatarUpdatedAt = new Date().toISOString()
  const playerUpdate: Database['public']['Tables']['players']['Update'] = {
    avatar_path: avatarPath,
    avatar_updated_at: avatarUpdatedAt,
  }
  const { error: updateError } = await admin.from('players')
    .update(playerUpdate)
    .eq('id', player.id)

  if (updateError) {
    return Response.json({ error: 'Failed to save photo' }, { status: 500 })
  }

  const auditEntry: Database['public']['Tables']['audit_log']['Insert'] = {
    action: 'player.photo.uploaded',
    performed_by: session.userId,
    target_id: player.id,
    target_type: 'player',
    metadata: { actor: 'self' },
  }
  const { error: auditErr } = await admin.from('audit_log').insert(auditEntry)
  if (auditErr) {
    console.error('audit_log insert failed', auditErr)
  }

  const avatarUrl = await signPlayerAvatarPath(avatarPath, true)

  return Response.json({
    avatar_path: avatarPath,
    avatar_updated_at: avatarUpdatedAt,
    avatar_url: avatarUrl,
  })
}

export async function DELETE() {
  const session = await fetchSessionContext()
  if (!session) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 })
  }

  if (!session.profile.approved) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { admin, player, error } = await resolveLinkedPlayer(session.userId)
  if (error) {
    return Response.json({ error: 'Failed to resolve player' }, { status: 500 })
  }

  if (!player) {
    return Response.json({ error: 'No linked player' }, { status: 404 })
  }

  const { error: deleteError } = await removePlayerAvatar(player.avatar_path, player.id)
  if (deleteError) {
    return Response.json({ error: 'Failed to delete photo' }, { status: 500 })
  }

  const playerUpdate: Database['public']['Tables']['players']['Update'] = {
    avatar_path: null,
    avatar_updated_at: null,
  }
  const { error: updateError } = await admin.from('players')
    .update(playerUpdate)
    .eq('id', player.id)

  if (updateError) {
    return Response.json({ error: 'Failed to clear photo' }, { status: 500 })
  }

  const auditEntry: Database['public']['Tables']['audit_log']['Insert'] = {
    action: 'player.photo.deleted',
    performed_by: session.userId,
    target_id: player.id,
    target_type: 'player',
    metadata: { actor: 'self' },
  }
  const { error: auditErr } = await admin.from('audit_log').insert(auditEntry)
  if (auditErr) {
    console.error('audit_log insert failed', auditErr)
  }

  return Response.json({ ok: true, avatar_path: null, avatar_updated_at: null, avatar_url: null })
}
