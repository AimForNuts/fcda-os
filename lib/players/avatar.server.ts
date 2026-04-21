import 'server-only'

import { createServiceClient } from '@/lib/supabase/server'
import {
  PLAYER_AVATAR_BUCKET,
  PLAYER_AVATAR_SIGNED_URL_TTL,
  getPlayerAvatarObjectPath,
  type AvatarBackedRecord,
  type AvatarResolvedRecord,
} from './avatar'

function isMissingStorageObjectError(error: { message?: string } | null) {
  return /not found/i.test(error?.message ?? '')
}

export async function signPlayerAvatarPath(
  avatarPath: string | null,
  canView: boolean
) {
  if (!canView || !avatarPath) {
    return null
  }

  const admin = createServiceClient()
  const { data, error } = await admin.storage
    .from(PLAYER_AVATAR_BUCKET)
    .createSignedUrl(avatarPath, PLAYER_AVATAR_SIGNED_URL_TTL)

  if (error) {
    console.error('player avatar signed url failed', error)
    return null
  }

  return data.signedUrl
}

export async function signPlayerAvatarRecords<T extends AvatarBackedRecord>(
  rows: T[],
  canView: boolean
): Promise<Array<AvatarResolvedRecord<T>>> {
  if (rows.length === 0) {
    return []
  }

  if (!canView) {
    return rows.map((row) => ({ ...row, avatar_url: null }))
  }

  const admin = createServiceClient()
  const urlCache = new Map<string, Promise<string | null>>()

  function getSignedUrl(avatarPath: string | null) {
    if (!avatarPath) {
      return Promise.resolve(null)
    }

    const existing = urlCache.get(avatarPath)
    if (existing) {
      return existing
    }

    const next = admin.storage
      .from(PLAYER_AVATAR_BUCKET)
      .createSignedUrl(avatarPath, PLAYER_AVATAR_SIGNED_URL_TTL)
      .then(({ data, error }) => {
        if (error) {
          console.error('player avatar signed url failed', error)
          return null
        }

        return data.signedUrl
      })

    urlCache.set(avatarPath, next)
    return next
  }

  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      avatar_url: await getSignedUrl(row.avatar_path),
    }))
  )
}

export async function uploadPlayerAvatar(playerId: string, file: File) {
  const avatarPath = getPlayerAvatarObjectPath(playerId)
  const admin = createServiceClient()
  const { error } = await admin.storage.from(PLAYER_AVATAR_BUCKET).upload(avatarPath, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: true,
  })

  if (error) {
    console.error('player avatar upload failed', error)
    return { avatarPath: null, error }
  }

  return { avatarPath, error: null }
}

export async function removePlayerAvatar(avatarPath: string | null, playerId?: string) {
  const pathToRemove = avatarPath ?? (playerId ? getPlayerAvatarObjectPath(playerId) : null)
  if (!pathToRemove) {
    return { error: null }
  }

  const admin = createServiceClient()
  const { error } = await admin.storage.from(PLAYER_AVATAR_BUCKET).remove([pathToRemove])

  if (error && !isMissingStorageObjectError(error)) {
    console.error('player avatar delete failed', error)
    return { error }
  }

  return { error: null }
}

export async function resolveLinkedPlayerIdentity(userId: string, canView: boolean) {
  const admin = createServiceClient()
  const { data: player, error } = await admin
    .from('players')
    .select('id, sheet_name, avatar_path')
    .eq('profile_id', userId)
    .maybeSingle() as {
      data: { id: string; sheet_name: string; avatar_path: string | null } | null
      error: unknown
    }

  if (error) {
    console.error('linked player lookup failed', error)
    return null
  }

  if (!player) {
    return null
  }

  return {
    id: player.id,
    name: player.sheet_name,
    avatar_url: await signPlayerAvatarPath(player.avatar_path, canView),
  }
}
