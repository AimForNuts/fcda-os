import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlayersTable } from '@/components/player/PlayersTable'

const players = [
  {
    id: '1',
    display_name: 'André Monforte',
    shirt_number: 29,
    current_rating: 7.5,
    profile_id: null,
    avatar_path: null,
    avatar_url: null,
    total_all: 2,
  },
]

describe('PlayersTable', () => {
  it('shows the Nota column when canViewRatings is true', () => {
    render(
      <PlayersTable players={players} isApproved={true} canViewRatings={true} />
    )
    expect(screen.getByRole('columnheader', { name: 'Nota' })).toBeInTheDocument()
    expect(screen.getByText('7.5')).toBeInTheDocument()
  })

  it('hides the Nota column when canViewRatings is false', () => {
    render(
      <PlayersTable players={players} isApproved={true} canViewRatings={false} />
    )
    expect(screen.queryByRole('columnheader', { name: 'Nota' })).not.toBeInTheDocument()
    expect(screen.queryByText('7.5')).not.toBeInTheDocument()
  })

  it('shows player name regardless of canViewRatings', () => {
    render(
      <PlayersTable players={players} isApproved={true} canViewRatings={false} />
    )
    expect(screen.getByText('André Monforte')).toBeInTheDocument()
  })
})
