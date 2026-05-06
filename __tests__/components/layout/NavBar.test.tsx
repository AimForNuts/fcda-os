import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Navbar } from '@/components/layout/Navbar'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/matches',
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
    const matchesButton = screen.getByRole('button', { name: /nav.matches/ })
    const playersLink = screen.getByRole('link', { name: 'nav.players' })
    const statsLink = screen.getByRole('link', { name: 'nav.stats' })

    expect(
      matchesButton.compareDocumentPosition(playersLink) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      playersLink.compareDocumentPosition(statsLink) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('opens match subroutes from the desktop Matches dropdown', () => {
    render(<Navbar profile={null} roles={[]} pendingCount={0} />)
    fireEvent.click(screen.getByRole('button', { name: /nav.matches/ }))

    expect(screen.getByText('nav.matchesMenu.calendarDescription')).toBeInTheDocument()
    expect(screen.getByText('nav.matchesMenu.resultsDescription')).toBeInTheDocument()
    expect(screen.getByText('nav.matchesMenu.myGamesDescription')).toBeInTheDocument()
  })

  it('renders match subroute links in the mobile drawer', () => {
    render(<Navbar profile={null} roles={[]} pendingCount={0} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))

    expect(screen.getByRole('link', { name: 'nav.matchesMenu.calendar' })).toHaveAttribute(
      'href',
      '/matches/calendario',
    )
    expect(screen.getByRole('link', { name: 'nav.matchesMenu.results' })).toHaveAttribute(
      'href',
      '/matches/resultados',
    )
    expect(screen.getByRole('link', { name: 'nav.matchesMenu.myGames' })).toHaveAttribute(
      'href',
      '/matches/os-meus-jogos',
    )
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
