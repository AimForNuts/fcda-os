import { describe, expect, it } from 'vitest'
import {
  PLAYER_AVATAR_MAX_BYTES,
  getPlayerAvatarObjectPath,
  validatePlayerAvatarFile,
} from '@/lib/players/avatar'

describe('player avatar helpers', () => {
  it('builds a stable storage path from the player id', () => {
    expect(getPlayerAvatarObjectPath('player-123')).toBe('players/player-123/avatar')
  })

  it('rejects missing files', () => {
    expect(validatePlayerAvatarFile(null)).toBe('Missing file')
  })

  it('rejects unsupported content types', () => {
    const file = new File(['hello'], 'avatar.gif', { type: 'image/gif' })
    expect(validatePlayerAvatarFile(file)).toBe('Unsupported file type')
  })

  it('rejects oversize files', () => {
    const file = new File(['a'.repeat(PLAYER_AVATAR_MAX_BYTES + 1)], 'avatar.png', {
      type: 'image/png',
    })
    expect(validatePlayerAvatarFile(file)).toBe('File too large')
  })

  it('accepts jpeg, png, and webp files within the size limit', () => {
    const file = new File(['ok'], 'avatar.webp', { type: 'image/webp' })
    expect(validatePlayerAvatarFile(file)).toBeNull()
  })
})
