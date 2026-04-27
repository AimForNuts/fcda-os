# Mobile Responsive Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the entire FCDA OS website usable on mobile devices, with a hamburger drawer for navigation and scrollable sub-navs for admin/mod sections.

**Architecture:** Targeted fixes to the three navigation components plus two minor layout issues — no new dependencies, pure Tailwind + React state.

**Primary users:** Regular members checking fixtures, match results, player profiles, and stats on their phones.

---

## Audit Summary

Most pages already use responsive Tailwind classes (`sm:`, `md:`, `lg:`) correctly. The `DataTable` component has `overflow-x-auto`. The critical gaps are:

1. **Navbar** — nav links are hidden on mobile (`hidden md:flex`) with no fallback; users cannot navigate
2. **AdminNav** — 5 horizontal tabs with no responsive handling; overflows on mobile
3. **ModSubNav** — 2 horizontal tabs with `flex gap-6`; overflows on mobile
4. **Minor:** `MatchesDateFilter` has hardcoded input widths; player profile has forced `min-w` constraints

---

## Section 1: Navbar — Hamburger Drawer

**File:** `components/layout/Navbar.tsx`

### Behaviour

- On mobile (`< md`): hamburger icon button appears in the top-right of the navbar, next to the theme toggle. Nav links remain hidden.
- Clicking the hamburger opens a full-height drawer sliding in from the right.
- A dark semi-transparent backdrop covers the rest of the screen. Clicking the backdrop closes the drawer.
- Inside the drawer: an `×` close button at the top-right, then the full list of nav links as large tappable rows.
- Navigating to a link closes the drawer.
- On desktop (`md+`): hamburger is hidden, existing horizontal nav is unchanged.

### Nav links in drawer

Same links as desktop, conditionally rendered based on auth state:
- Always: Início (`/`), Jogos (`/matches`), Jogadores (`/players`), Estatísticas (`/stats`)
- Authenticated: Perfil (`/profile`)
- Unauthenticated: Entrar (`/login`)
- Role `mod` or `admin`: Gerir (`/mod/games/new`)
- Role `admin`: Admin (`/admin/users`)
- Authenticated: Sair (logout button)

### Implementation

- Add `const [isOpen, setIsOpen] = useState(false)` to `Navbar`.
- Hamburger button: `<button type="button" className="md:hidden" onClick={() => setIsOpen(true)}>` with a 3-line SVG icon.
- Drawer: fixed overlay `div` with `z-50`, backdrop `onClick={() => setIsOpen(false)}`, and the nav panel with `translate-x-full`/`translate-x-0` transition based on `isOpen`.
- Active link detection: reuse the existing `pathname` logic already in `Navbar`.
- Close drawer on link click by calling `setIsOpen(false)` in the link's `onClick`.

---

## Section 2: AdminNav — Scrollable Tabs

**File:** `components/admin/AdminNav.tsx`

### Behaviour

- On mobile: the 5-tab row (`Utilizadores`, `Jogadores`, `Avaliações`, `Feedback`, `Treinador`) is horizontally scrollable. Users swipe left/right to reveal all tabs. The scrollbar is hidden visually.
- On desktop: no change to existing layout.

### Implementation

- Wrap the inner tab `div` (or the `nav` element) in a container with `overflow-x-auto` and add a CSS rule to hide the scrollbar (`scrollbar-hide` utility or `[&::-webkit-scrollbar]:hidden`).
- Add `whitespace-nowrap` to each tab link so text doesn't wrap.
- No breakpoint switching needed — `overflow-x-auto` is harmless on desktop when content fits.

---

## Section 3: ModSubNav — Scrollable Tabs

**File:** `components/mod/ModSubNav.tsx`

### Behaviour

- Same pattern as AdminNav: the inner flex container becomes horizontally scrollable on mobile.
- 2 tabs (`Jogos`, `Assistente IA`) — barely overflows but treated consistently.

### Implementation

- Add `overflow-x-auto` and hidden scrollbar styles to the inner container (`container max-w-screen-xl mx-auto px-4 flex gap-6`).
- Add `whitespace-nowrap` to the tab link elements.
- Remove any `overflow-hidden` that might clip the scroll container if present.

---

## Section 4: Minor Layout Fixes

### 4a. MatchesDateFilter input widths

**File:** `components/matches/MatchesDateFilter.tsx` (lines 50, 66)

- Change `w-[9.25rem] md:w-36` → `w-full sm:w-36` on both date inputs so they expand to fill available width on very narrow screens instead of being cut off.

### 4b. Player profile min-width constraints

**File:** `app/(public)/players/[id]/page.tsx`

- Remove `sm:min-w-[18rem]` and `sm:min-w-[12rem]` from stat grid blocks. These constraints can force horizontal overflow when the viewport is narrow. The existing `grid` layout handles sizing without forced minimums.

---

## Out of Scope

- Bottom tab bar navigation (decided against in favour of hamburger drawer)
- Admin/mod pages beyond AdminNav and ModSubNav
- Any table column hiding on mobile (tables already have `overflow-x-auto`)
- UserTable and PlayerTable action button layout (functional, low priority)
