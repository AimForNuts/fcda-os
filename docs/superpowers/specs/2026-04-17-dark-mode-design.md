# Dark Mode Implementation Design

## Goal

Add a light/dark theme toggle to the app. The current style is the light theme. The dark theme uses a deep navy/black palette already defined in `globals.css`. Users can toggle between themes from the navbar; preference is persisted across sessions.

---

## Current State

`app/globals.css` already has:
- `:root` — light theme (white background, navy/gold accents)
- `.dark` — dark theme (deep navy background `oklch(0.13 0.03 244)`, slightly lighter navy cards, gold as primary accent)
- `@custom-variant dark (&:is(.dark *))` — Tailwind dark variant already wired

`app/layout.tsx` already has `suppressHydrationWarning` on `<html>`.

No colour changes are required — the palette is done.

---

## Approach

Use `next-themes` to manage theme state. It:
- Applies the `.dark` class to `<html>` when dark mode is active
- Persists preference to `localStorage` automatically
- Prevents flash-of-wrong-theme (FOUC) on page load via an inline script injected before hydration

---

## Architecture

| File | Action | Purpose |
|------|--------|---------|
| `package.json` | Modify | Add `next-themes` dependency |
| `app/layout.tsx` | Modify | Wrap `I18nProvider` children in `ThemeProvider` from `next-themes` |
| `components/layout/ThemeToggle.tsx` | Create | Client component — sun/moon button using `useTheme()` |
| `components/layout/Navbar.tsx` | Modify | Render `<ThemeToggle />` between language toggle and avatar |

---

## ThemeProvider setup

In `app/layout.tsx`, import `ThemeProvider` from `next-themes` and wrap the existing `I18nProvider`:

```tsx
import { ThemeProvider } from 'next-themes'

// inside RootLayout:
<ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
  <I18nProvider>{children}</I18nProvider>
</ThemeProvider>
```

- `attribute="class"` — adds/removes `.dark` class on `<html>`
- `defaultTheme="light"` — light is the default for new users
- `disableTransitionOnChange` — avoids jarring CSS transitions when switching themes

---

## ThemeToggle component

`components/layout/ThemeToggle.tsx` — a `'use client'` component:

```tsx
'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return <div className="h-8 w-10" /> // stable placeholder to avoid layout shift

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}
```

The `mounted` guard prevents a server/client mismatch: on the server `theme` is unknown, so we render a same-size placeholder and only show the real icon after hydration.

---

## Navbar change

In `components/layout/Navbar.tsx`, import and render `<ThemeToggle />` in the right actions section, between the language button and the avatar:

```tsx
import { ThemeToggle } from './ThemeToggle'

// inside the "Right actions" div, after the language button:
<ThemeToggle />
```

Navbar stays a server component — `ThemeToggle` is the only client boundary introduced.

---

## No i18n keys needed

The toggle has no visible text — icon only with an `aria-label`. No i18n strings required.

---

## No tests required

`ThemeToggle` delegates entirely to `next-themes`; testing the button click would just test the library. The `mounted` guard is a hydration safeguard with no logic to unit-test.
