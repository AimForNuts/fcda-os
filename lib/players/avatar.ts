export const PLAYER_AVATAR_BUCKET = 'player-avatars'
export const PLAYER_AVATAR_MAX_BYTES = 5 * 1024 * 1024
export const PLAYER_AVATAR_SIGNED_URL_TTL = 60 * 60

export const PLAYER_AVATAR_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export const PLAYER_AVATAR_THUMB_TRANSFORM = {
  width: 320,
  height: 320,
  resize: 'cover',
  quality: 76,
} as const

export const PLAYER_AVATAR_PROFILE_TRANSFORM = {
  width: 768,
  height: 1024,
  resize: 'cover',
  quality: 78,
} as const

export type PlayerAvatarContentType = (typeof PLAYER_AVATAR_ALLOWED_TYPES)[number]

export type AvatarBackedRecord = {
  avatar_path: string | null
}

export type AvatarResolvedRecord<T extends AvatarBackedRecord> = T & {
  avatar_url: string | null
}

export function getPlayerAvatarObjectPath(playerId: string) {
  return `players/${playerId}/avatar`
}

export function isValidPlayerAvatarType(
  contentType: string
): contentType is PlayerAvatarContentType {
  return PLAYER_AVATAR_ALLOWED_TYPES.includes(contentType as PlayerAvatarContentType)
}

export function validatePlayerAvatarFile(file: File | null | undefined) {
  if (!(file instanceof File)) {
    return 'Missing file'
  }

  if (!isValidPlayerAvatarType(file.type)) {
    return 'Unsupported file type'
  }

  if (file.size > PLAYER_AVATAR_MAX_BYTES) {
    return 'File too large'
  }

  return null
}
