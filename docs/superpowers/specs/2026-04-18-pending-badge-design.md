# Pending Users Badge Design

## Goal

Show a red dot on the Admin nav link when there are pending user approval requests, so admins notice new registrations without visiting the admin panel.

---

## Current State

- `app/(app)/layout.tsx` — server component, fetches session and renders `<Navbar profile roles />`
- `components/layout/Navbar.tsx` — client component, renders Admin link when `isAdmin`
- `profiles` table has an `approved: boolean` column; pending users have `approved = false`

---

## Approach

Fetch pending count server-side in the layout and pass it as a prop to Navbar. The dot renders on first paint — no client-side fetch, no flicker.

---

## Architecture

| File | Change |
|------|--------|
| `app/(app)/layout.tsx` | Query pending count for admins; pass `pendingCount` to Navbar |
| `components/layout/Navbar.tsx` | Add `pendingCount: number` prop; render red dot on Admin link |

---

## Data Fetching

In `app/(app)/layout.tsx`, after resolving the session:

```ts
import { createServiceClient } from '@/lib/supabase/server'

const isAdmin = session.roles.includes('admin')
const pendingCount = isAdmin
  ? await createServiceClient()
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('approved', false)
      .then(r => r.count ?? 0)
  : 0
```

Use the service client (bypasses RLS) since the layout already runs server-side with full trust. Query only runs for admins.

---

## Navbar Change

Add `pendingCount: number` to `NavbarProps`. On the Admin link:

```tsx
{isAdmin && (
  <Link
    href="/admin/users"
    className="relative flex items-center gap-1 text-white/70 hover:text-white transition-colors"
  >
    <ShieldCheck className="h-3.5 w-3.5" />
    {t('nav.admin')}
    {pendingCount > 0 && (
      <span className="absolute -top-1 -right-2 h-2 w-2 rounded-full bg-red-500" />
    )}
  </Link>
)}
```

The `relative` wrapper enables absolute positioning of the dot. No number — dot only.

---

## No Tests Required

The pending count query has no branching logic to unit-test. The dot rendering is a trivial conditional already covered by TypeScript.
