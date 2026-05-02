import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MatchComments } from '@/components/matches/MatchComments'

const refresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

const mentionableUsers = [
  { id: '11111111-1111-4111-8111-111111111111', display_name: 'João Silva' },
  { id: '22222222-2222-4222-8222-222222222222', display_name: 'Maria Costa' },
]

describe('MatchComments', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    refresh.mockReset()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('shows a sign-in call to action when no current user is present', () => {
    render(
      <MatchComments
        gameId="game-1"
        comments={[]}
        mentionableUsers={[]}
        currentUser={null}
      />
    )

    expect(screen.getByText('Inicia sessão para comentar.')).toBeInTheDocument()
    expect(screen.getByText('Entrar')).toBeInTheDocument()
  })

  it('inserts a selected mention into the composer', () => {
    render(
      <MatchComments
        gameId="game-1"
        comments={[]}
        mentionableUsers={mentionableUsers}
        currentUser={mentionableUsers[1]}
      />
    )

    const textarea = screen.getByLabelText('Comentário')
    fireEvent.change(textarea, { target: { value: '@jo' } })
    fireEvent.click(screen.getByRole('button', { name: 'João Silva' }))

    expect(textarea).toHaveValue('@João Silva ')
  })

  it('submits text content and resolved mention IDs', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'comment-1',
        author_id: mentionableUsers[1].id,
        author_name: mentionableUsers[1].display_name,
        author_avatar_url: 'https://example.com/avatar.jpg',
        content: 'Boa @João Silva ⚽',
        mention_user_ids: [mentionableUsers[0].id],
        created_at: '2026-05-01T12:00:00.000Z',
      }),
    })

    render(
      <MatchComments
        gameId="game-1"
        comments={[]}
        mentionableUsers={mentionableUsers}
        currentUser={mentionableUsers[1]}
      />
    )

    fireEvent.change(screen.getByLabelText('Comentário'), {
      target: { value: 'Boa @João Silva ⚽' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Publicar/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/matches/game-1/comments',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            content: 'Boa @João Silva ⚽',
            mentionUserIds: [mentionableUsers[0].id],
          }),
        })
      )
    })
    expect(await screen.findByText('Maria Costa')).toBeInTheDocument()
    expect(screen.getByText('@João Silva')).toBeInTheDocument()
    expect(refresh).toHaveBeenCalled()
  })

  it('renders emoji comments without splitting characters', () => {
    render(
      <MatchComments
        gameId="game-1"
        comments={[
          {
            id: 'comment-1',
            author_id: mentionableUsers[1].id,
            author_name: mentionableUsers[1].display_name,
            author_avatar_url: null,
            content: 'Bom jogo 💪',
            mention_user_ids: [],
            created_at: '2026-05-01T12:00:00.000Z',
          },
        ]}
        mentionableUsers={mentionableUsers}
        currentUser={mentionableUsers[1]}
      />
    )

    expect(screen.getByText('Bom jogo 💪')).toBeInTheDocument()
  })

  it('edits an owned comment', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'comment-1',
        author_id: mentionableUsers[1].id,
        author_name: mentionableUsers[1].display_name,
        author_avatar_url: null,
        content: 'Editado @João Silva',
        mention_user_ids: [mentionableUsers[0].id],
        created_at: '2026-05-01T12:00:00.000Z',
      }),
    })

    render(
      <MatchComments
        gameId="game-1"
        comments={[
          {
            id: 'comment-1',
            author_id: mentionableUsers[1].id,
            author_name: mentionableUsers[1].display_name,
            author_avatar_url: null,
            content: 'Original',
            mention_user_ids: [],
            created_at: '2026-05-01T12:00:00.000Z',
          },
        ]}
        mentionableUsers={mentionableUsers}
        currentUser={mentionableUsers[1]}
      />
    )

    fireEvent.click(screen.getByTitle('Editar comentário'))
    const editTextarea = screen.getByLabelText('Editar comentário')
    fireEvent.change(editTextarea, { target: { value: 'Editado ' } })
    fireEvent.click(screen.getAllByTitle('Menção')[0])
    expect(editTextarea).toHaveValue('Editado @')
    fireEvent.change(editTextarea, { target: { value: 'Editado @jo' } })
    fireEvent.click(screen.getByRole('button', { name: 'João Silva' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Inserir ⚽' })[0])
    expect(editTextarea).toHaveValue('Editado @João Silva ⚽')
    fireEvent.click(screen.getByRole('button', { name: /Guardar/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/matches/game-1/comments/comment-1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            content: 'Editado @João Silva ⚽',
            mentionUserIds: [mentionableUsers[0].id],
          }),
        })
      )
    })
    expect(await screen.findByText('Editado')).toBeInTheDocument()
    expect(refresh).toHaveBeenCalled()
  })

  it('deletes an owned comment', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, id: 'comment-1' }),
    })

    render(
      <MatchComments
        gameId="game-1"
        comments={[
          {
            id: 'comment-1',
            author_id: mentionableUsers[1].id,
            author_name: mentionableUsers[1].display_name,
            author_avatar_url: null,
            content: 'Apagar isto',
            mention_user_ids: [],
            created_at: '2026-05-01T12:00:00.000Z',
          },
        ]}
        mentionableUsers={mentionableUsers}
        currentUser={mentionableUsers[1]}
      />
    )

    fireEvent.click(screen.getByTitle('Eliminar comentário'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/matches/game-1/comments/comment-1', {
        method: 'DELETE',
      })
    })
    expect(screen.queryByText('Apagar isto')).not.toBeInTheDocument()
    expect(refresh).toHaveBeenCalled()
  })
})
