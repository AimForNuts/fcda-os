import { describe, it, expect } from 'vitest'
import {
  canAccessMod,
  canAccessAdmin,
  unionPermissions,
} from '@/lib/auth/permissions'

describe('canAccessMod', () => {
  it('returns true for mod role', () => {
    expect(canAccessMod(['mod'])).toBe(true)
  })

  it('returns true for admin role', () => {
    expect(canAccessMod(['admin'])).toBe(true)
  })

  it('returns true for both mod and admin', () => {
    expect(canAccessMod(['mod', 'admin'])).toBe(true)
  })

  it('returns true for player + mod combination', () => {
    expect(canAccessMod(['player', 'mod'])).toBe(true)
  })

  it('returns false for player role only', () => {
    expect(canAccessMod(['player'])).toBe(false)
  })

  it('returns false for empty roles', () => {
    expect(canAccessMod([])).toBe(false)
  })
})

describe('canAccessAdmin', () => {
  it('returns true for admin role', () => {
    expect(canAccessAdmin(['admin'])).toBe(true)
  })

  it('returns true for admin + other roles', () => {
    expect(canAccessAdmin(['player', 'mod', 'admin'])).toBe(true)
  })

  it('returns false for mod role only', () => {
    expect(canAccessAdmin(['mod'])).toBe(false)
  })

  it('returns false for player role only', () => {
    expect(canAccessAdmin(['player'])).toBe(false)
  })

  it('returns false for empty roles', () => {
    expect(canAccessAdmin([])).toBe(false)
  })
})

describe('unionPermissions', () => {
  it('returns highest permission level for multiple roles', () => {
    const perms = unionPermissions(['player', 'mod'])
    expect(perms.canRead).toBe(true)
    expect(perms.canManageGames).toBe(true)
    expect(perms.canManageUsers).toBe(false)
  })

  it('returns all permissions for admin', () => {
    const perms = unionPermissions(['admin'])
    expect(perms.canRead).toBe(true)
    expect(perms.canManageGames).toBe(true)
    expect(perms.canManageUsers).toBe(true)
  })

  it('returns read-only for player', () => {
    const perms = unionPermissions(['player'])
    expect(perms.canRead).toBe(true)
    expect(perms.canManageGames).toBe(false)
    expect(perms.canManageUsers).toBe(false)
  })

  it('returns no permissions for empty roles', () => {
    const perms = unionPermissions([])
    expect(perms.canRead).toBe(false)
    expect(perms.canManageGames).toBe(false)
    expect(perms.canManageUsers).toBe(false)
  })
})
