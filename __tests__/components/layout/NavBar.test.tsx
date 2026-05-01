import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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

vi.mock('@/components/layout/ThemeToggle', () => ({
  ThemeToggle: () => null,
}))

describe('Navbar', () => {
  it('renders the Players nav link', () => {
    render(<Navbar profile={null} roles={[]} pendingCount={0} />)
    expect(screen.getByRole('link', { name: 'nav.players' })).toHaveAttribute('href', '/players')
  })

  it('renders Players link between Matches and Stats', () => {
    render(<Navbar profile={null} roles={[]} pendingCount={0} />)
    // Drawer is mount-gated on isOpen (false by default), so only desktop nav links are in the DOM
    const links = screen.getAllByRole('link')
    const hrefs = links.map((l) => l.getAttribute('href'))
    const matchesIdx = hrefs.indexOf('/matches')
    const playersIdx = hrefs.indexOf('/players')
    const statsIdx = hrefs.indexOf('/stats')
    expect(playersIdx).toBeGreaterThan(matchesIdx)
    expect(playersIdx).toBeLessThan(statsIdx)
  })

  it('does not render the Manage nav link for mod users', () => {
    render(<Navbar profile={null} roles={['mod']} pendingCount={0} />)
    expect(screen.queryByRole('link', { name: 'nav.mod' })).not.toBeInTheDocument()
  })

  it('renders hamburger menu button', () => {
    render(<Navbar profile={null} roles={[]} pendingCount={0} />)
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument()
  })

  it('hamburger button starts with aria-expanded false', () => {
    render(<Navbar profile={null} roles={[]} pendingCount={0} />)
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('clicking hamburger opens the drawer and shows close button', () => {
    render(<Navbar profile={null} roles={[]} pendingCount={0} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Close menu' })).toBeInTheDocument()
  })

  it('clicking close button closes the drawer', () => {
    render(<Navbar profile={null} roles={[]} pendingCount={0} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close menu' }))
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('button', { name: 'Close menu' })).not.toBeInTheDocument()
  })

  it('pressing Escape closes the drawer', () => {
    render(<Navbar profile={null} roles={[]} pendingCount={0} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('button', { name: 'Close menu' })).not.toBeInTheDocument()
  })
})
