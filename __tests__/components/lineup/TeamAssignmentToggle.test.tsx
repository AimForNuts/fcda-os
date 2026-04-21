import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { TeamAssignmentToggle } from '@/components/lineup/TeamAssignmentToggle'

describe('TeamAssignmentToggle', () => {
  it('renders white, black, and no-team options with accessible labels', () => {
    render(<TeamAssignmentToggle value="a" onChange={() => {}} noTeamLabel="No team" />)

    expect(screen.getByRole('button', { name: 'Equipa Branca' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Equipa Preta' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'No team' })).toBeInTheDocument()
  })

  it('calls onChange with the selected option', () => {
    const onChange = vi.fn()

    render(<TeamAssignmentToggle value={null} onChange={onChange} noTeamLabel="No team" />)

    fireEvent.click(screen.getByRole('button', { name: 'Equipa Preta' }))
    fireEvent.click(screen.getByRole('button', { name: 'No team' }))

    expect(onChange).toHaveBeenNthCalledWith(1, 'b')
    expect(onChange).toHaveBeenNthCalledWith(2, null)
  })
})
