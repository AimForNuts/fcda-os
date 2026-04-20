# FCDA OS

[![Database migrations](https://github.com/AimForNuts/fcda-os/actions/workflows/migrate.yml/badge.svg)](https://github.com/AimForNuts/fcda-os/actions/workflows/migrate.yml)
[![Vercel](https://img.shields.io/badge/Vercel-fcda--os.vercel.app-000000?style=flat-square&logo=vercel&logoColor=white)](https://fcda-os.vercel.app)

Web app for **Futebol Clube Dragões da Areosa** (FCDA): public site, member flows, moderator tools, and admin. Built with the Next.js App Router, backed by Supabase.

## Stack

- [Next.js](https://nextjs.org/) 16, React 19, TypeScript
- [Supabase](https://supabase.com/) (auth, Postgres, RLS)
- [Tailwind CSS](https://tailwindcss.com/) 4, [shadcn/ui](https://ui.shadcn.com/)–style components
- [Vitest](https://vitest.dev/) and Testing Library for tests
- [i18next](https://www.i18next.com/) for internationalisation

## Deployment

- **Production:** [fcda-os.vercel.app](https://fcda-os.vercel.app) (Vercel)
- **Database migrations:** [GitHub Actions](https://github.com/AimForNuts/fcda-os/actions/workflows/migrate.yml) runs `supabase db push` when `supabase/migrations/**` changes on `main`

## Prerequisites

- Node.js (LTS recommended)
- A Supabase project with the schema this app expects (URL and API keys from the dashboard)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Environment variables — copy the example file and fill in values from **Supabase → Project Settings → API**:

   ```bash
   cp .env.local.example .env.local
   ```

   Required variables are documented in [.env.local.example](.env.local.example).

3. Start the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command            | Description              |
| ------------------ | ------------------------ |
| `npm run dev`      | Development server       |
| `npm run build`    | Production build         |
| `npm run start`    | Run production server    |
| `npm run lint`     | ESLint                   |
| `npm test`         | Vitest (watch)           |
| `npm run test:run` | Vitest (single run, CI)  |

## App structure (high level)

Route groups under `app/`:

- `(public)` — landing, matches, stats, players
- `(auth)` — login, register, password flows
- `(app)` — signed-in member area (e.g. profile, rating)
- `(mod)` — moderator tools (games, lineup, AI assistant)
- `(admin)` — admin (users, players, feedback, ratings)

API routes live under `app/api/`. Shared Supabase clients are in `lib/supabase/`.

## Learn more

- [Next.js documentation](https://nextjs.org/docs)
- [Supabase + Next.js](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
