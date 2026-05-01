import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AiAssistantClient } from '@/app/(mod)/mod/ai-assistant/AiAssistantClient'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

const gameId = '77112daa-a20d-40e0-aee3-551c588a0fde'
const playerA = '11111111-1111-4111-8111-111111111111'
const playerB = '22222222-2222-4222-8222-222222222222'

const mockFetch = vi.fn()
global.fetch = mockFetch

function jsonResponse(data: unknown, ok = true) {
  return {
    ok,
    json: async () => data,
  } as Response
}

describe('AiAssistantClient', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    push.mockReset()
  })

  it('generates a structured preview and applies captain payload', async () => {
    mockFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (url === `/api/games/${gameId}/players`) {
        return Promise.resolve(jsonResponse([
          {
            id: playerA,
            sheet_name: 'Carlos',
            current_rating: 7,
            preferred_positions: ['CM'],
            avatar_url: null,
            last3Ratings: [],
            totalGames: 1,
            winPct: 100,
            recentFeedback: [],
          },
          {
            id: playerB,
            sheet_name: 'João',
            current_rating: 6,
            preferred_positions: ['ST'],
            avatar_url: null,
            last3Ratings: [],
            totalGames: 1,
            winPct: 0,
            recentFeedback: [],
          },
        ]))
      }

      if (url === '/api/mod/ai-assistant/generate') {
        expect(JSON.parse(String(init?.body))).toEqual({ gameId })
        return Promise.resolve(jsonResponse({
          game_id: gameId,
          team_a: {
            label: 'Equipa Branca',
            players: [{
            player_id: playerA,
            sheet_name: 'Carlos',
            shirt_number: 10,
            current_rating: 7,
              preferred_positions: ['CM'],
              avatar_url: null,
              is_captain: true,
            }],
            rating_total: 7,
            average_rating: 7,
          },
          team_b: {
            label: 'Equipa Preta',
            players: [{
            player_id: playerB,
            sheet_name: 'João',
            shirt_number: 5,
            current_rating: 6,
              preferred_positions: ['ST'],
              avatar_url: null,
              is_captain: true,
            }],
            rating_total: 6,
            average_rating: 6,
          },
          balance: { rating_delta: 1, player_count_delta: 0 },
          notes: [],
          reasoning: ['Split the highest rated players.'],
        }))
      }

      if (url === `/api/games/${gameId}/lineup`) {
        expect(init?.method).toBe('PUT')
        expect(JSON.parse(String(init?.body))).toEqual({
          players: [
            { player_id: playerA, team: 'a', is_captain: true },
            { player_id: playerB, team: 'b', is_captain: true },
          ],
        })
        return Promise.resolve(jsonResponse({ ok: true }))
      }

      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    })

    render(<AiAssistantClient games={[{ id: gameId, date: '2026-05-01T10:00:00Z', location: 'Arca' }]} />)

    expect(await screen.findByText('Carlos')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Generate Teams' }))

    expect(await screen.findByText('Equipa Branca')).toBeInTheDocument()
    expect(screen.getAllByText('C')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Reasoning' }))
    expect(screen.getByText('Split the highest rated players.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Apply to Lineup' }))

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith(`/mod/games/${gameId}/lineup`)
    })
  })
})
