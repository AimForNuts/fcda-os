import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlayerChip } from '@/components/lineup/PlayerChip'

describe('PlayerChip', () => {
  it('renders the player name', () => {
    render(<PlayerChip name="João Silva" status="matched" />)
    expect(screen.getByText('João Silva')).toBeInTheDocument()
  })

  it('applies green styles for matched status', () => {
    render(<PlayerChip name="Test" status="matched" />)
    expect(screen.getByTestId('player-chip')).toHaveClass('text-green-800')
  })

  it('applies amber styles for ambiguous status', () => {
    render(<PlayerChip name="Test" status="ambiguous" />)
    expect(screen.getByTestId('player-chip')).toHaveClass('text-amber-800')
  })

  it('applies red styles for unmatched status', () => {
    render(<PlayerChip name="Test" status="unmatched" />)
    expect(screen.getByTestId('player-chip')).toHaveClass('text-red-800')
  })
})
