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
    // The outer span wraps the name text
    const chip = screen.getByText('Test').closest('span[class]')
    expect(chip).toHaveClass('text-green-800')
  })

  it('applies amber styles for ambiguous status', () => {
    render(<PlayerChip name="Test" status="ambiguous" />)
    const chip = screen.getByText('Test').closest('span[class]')
    expect(chip).toHaveClass('text-amber-800')
  })

  it('applies red styles for unmatched status', () => {
    render(<PlayerChip name="Test" status="unmatched" />)
    const chip = screen.getByText('Test').closest('span[class]')
    expect(chip).toHaveClass('text-red-800')
  })
})
