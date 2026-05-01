import { describe, expect, it } from 'vitest'
import { extractMentionUserIds, getMentionToken } from '@/lib/matches/comments'

const users = [
  { id: 'user-1', display_name: 'João Silva' },
  { id: 'user-2', display_name: 'Ana' },
  { id: 'user-3', display_name: 'Ana Maria' },
]

describe('match comment mentions', () => {
  it('builds the visible mention token from a profile display name', () => {
    expect(getMentionToken(users[0])).toBe('@João Silva')
  })

  it('extracts mentioned user IDs case-insensitively', () => {
    expect(extractMentionUserIds('Grande passe @joão silva ⚽', users)).toEqual(['user-1'])
  })

  it('prefers longer display names at the same mention position', () => {
    expect(extractMentionUserIds('Obrigado @Ana Maria', users)).toEqual(['user-3'])
  })

  it('deduplicates repeated mentions', () => {
    expect(extractMentionUserIds('@Ana boa assistência. @Ana outra vez.', users)).toEqual(['user-2'])
  })
})
