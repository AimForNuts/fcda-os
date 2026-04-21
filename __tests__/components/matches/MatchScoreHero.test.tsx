import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MatchScoreHero } from '@/components/matches/MatchScoreHero'

describe('MatchScoreHero', () => {
  it('maps the correct scores and kit images to each team', () => {
    render(<MatchScoreHero scoreA={3} scoreB={2} />)

    expect(screen.getByAltText('Kit da Equipa Branca')).toBeInTheDocument()
    expect(screen.getByAltText('Kit da Equipa Preta')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('shows placeholder scores when values are missing', () => {
    render(<MatchScoreHero scoreA={null} scoreB={null} />)

    expect(screen.getAllByText('-')).toHaveLength(2)
  })
})
