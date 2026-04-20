import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Navbar } from '@/components/layout/Navbar'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { signOut: vi.fn() } }),
}))

vi.mock('@/i18n/config', () => ({
  default: { language: 'pt-PT', changeLanguage: vi.fn() },
}))

describe('Navbar', () => {
  it('renders the Players nav link', () => {
    render(<Navbar profile={null} roles={[]} pendingCount={0} />)
    expect(screen.getByRole('link', { name: 'nav.players' })).toHaveAttribute(
      'href',
      '/players',
    )
  })

  it('renders Players link between Matches and Stats', () => {
    render(<Navbar profile={null} roles={[]} pendingCount={0} />)
    const links = screen.getAllByRole('link')
    const hrefs = links.map(l => l.getAttribute('href'))
    const matchesIdx = hrefs.indexOf('/matches')
    const playersIdx = hrefs.indexOf('/players')
    const statsIdx = hrefs.indexOf('/stats')
    expect(playersIdx).toBeGreaterThan(matchesIdx)
    expect(playersIdx).toBeLessThan(statsIdx)
  })
})
