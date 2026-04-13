import type { UserRole, Profile, SessionContext } from '@/types'

/** Returns true if the role list grants mod-level access (mod or admin). */
export function canAccessMod(roles: UserRole[]): boolean {
  return roles.includes('mod') || roles.includes('admin')
}

/** Returns true if the role list grants admin-level access. */
export function canAccessAdmin(roles: UserRole[]): boolean {
  return roles.includes('admin')
}

export type Permissions = {
  canRead: boolean
  canManageGames: boolean
  canManageUsers: boolean
  canSubmitRatings: boolean
  canSubmitFeedback: boolean
}

/** Derives the union of all permissions for a given role list. */
export function unionPermissions(roles: UserRole[]): Permissions {
  const isPlayer = roles.includes('player') || roles.includes('mod') || roles.includes('admin')
  const isMod = canAccessMod(roles)
  const isAdmin = canAccessAdmin(roles)

  return {
    canRead: isPlayer,
    canManageGames: isMod,
    canManageUsers: isAdmin,
    canSubmitRatings: isPlayer,
    canSubmitFeedback: isPlayer,
  }
}

/**
 * Server-side: fetch the calling user's roles from Supabase.
 * Use in Server Components and Route Handlers.
 */
export async function fetchUserRoles(userId: string): Promise<UserRole[]> {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
  const rows = data as Array<{ role: UserRole }> | null
  return rows?.map((r) => r.role) ?? []
}

/**
 * Server-side: fetch the calling user's profile and check approval.
 * Returns null if no session or profile not found.
 */
export async function fetchSessionContext() {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  const roles = await fetchUserRoles(user.id)

  return { userId: user.id, profile: profile as Profile, roles } satisfies SessionContext
}
