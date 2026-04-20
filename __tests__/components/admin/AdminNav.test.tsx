import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AdminNav } from '@/components/admin/AdminNav'

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/users',
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}))

describe('AdminNav', () => {
  it('renders both nav links', () => {
    render(<AdminNav />)
    expect(
      screen.getByRole('link', { name: 'admin.users' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'admin.players' }),
    ).toBeInTheDocument()
  })

  it('marks the active path with active styles', () => {
    render(<AdminNav />)
    const usersLink = screen.getByRole('link', { name: 'admin.users' })
    expect(usersLink).toHaveClass('border-fcda-gold')
  })

  it('marks inactive paths without active styles', () => {
    render(<AdminNav />)
    const playersLink = screen.getByRole('link', { name: 'admin.players' })
    expect(playersLink).toHaveClass('border-transparent')
  })

  it('renders the ratings nav link', () => {
    render(<AdminNav />)
    expect(
      screen.getByRole('link', { name: 'admin.ratings' }),
    ).toBeInTheDocument()
  })

  it('renders the feedback nav link', () => {
    render(<AdminNav />)
    expect(
      screen.getByRole('link', { name: 'admin.feedback' }),
    ).toBeInTheDocument()
  })
})
