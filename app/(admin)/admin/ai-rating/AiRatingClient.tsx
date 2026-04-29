'use client'

import { useState } from 'react'
import type { PlayerRow } from './page'

type Suggestion = {
  player_id: string
  player_name: string
  current_rating: number | null
  suggested_rating: number
  pending_count: number
}

export function AiRatingClient({ players }: { players: PlayerRow[] }) {
  const [state, setState] = useState<'idle' | 'loading' | 'confirm'>('idle')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [edited, setEdited] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)

  const pendingCount = players.filter((p) => p.pending_count > 0).length

  async function handleProcess() {
    setError(null)
    setState('loading')
    const res = await fetch('/api/admin/ai-rating/process', { method: 'POST' })
    if (!res.ok) {
      setError('Falha ao contactar a IA. Tenta novamente.')
      setState('idle')
      return
    }
    const data = await res.json()
    const sug: Suggestion[] = data.players
    setSuggestions(sug)
    setEdited(Object.fromEntries(sug.map((s: Suggestion) => [s.player_id, s.suggested_rating])))
    setState('confirm')
  }

  async function handleApply() {
    setError(null)
    const updates = suggestions.map((s) => ({
      player_id: s.player_id,
      new_rating: Math.round((edited[s.player_id] ?? s.suggested_rating) * 10) / 10,
    }))
    const res = await fetch('/api/admin/ai-rating/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    })
    if (!res.ok) {
      setError('Falha ao aplicar avaliações. Tenta novamente.')
      return
    }
    setState('idle')
    setSuggestions([])
    setEdited({})
  }

  const displayRows: Array<Suggestion | PlayerRow> =
    state === 'confirm' ? suggestions : players

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {pendingCount} jogador{pendingCount !== 1 ? 'es' : ''} com avaliações por processar
        </p>
        {state === 'idle' && (
          <button
            onClick={handleProcess}
            disabled={pendingCount === 0}
            className="px-4 py-2 bg-fcda-gold text-fcda-navy text-sm font-semibold rounded disabled:opacity-40"
          >
            Processar com IA
          </button>
        )}
        {state === 'loading' && (
          <span className="text-sm text-muted-foreground animate-pulse">A perguntar à IA…</span>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-2 pr-4 font-medium">Jogador</th>
              <th className="py-2 pr-4 font-medium text-right">Avaliação atual</th>
              <th className="py-2 pr-4 font-medium text-right">Pendentes</th>
              {state === 'confirm' && (
                <>
                  <th className="py-2 pr-4 font-medium text-right">Sugestão IA</th>
                  <th className="py-2 font-medium text-right">Variação</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row) => {
              const hasPending = row.pending_count > 0
              const current = row.current_rating ?? 0
              const editedVal = state === 'confirm' ? (edited[row.player_id] ?? (row as Suggestion).suggested_rating) : null
              const delta = editedVal !== null ? editedVal - current : null

              return (
                <tr
                  key={row.player_id}
                  className={`border-b border-border ${!hasPending && state !== 'confirm' ? 'opacity-40' : ''}`}
                >
                  <td className="py-2 pr-4">{row.player_name}</td>
                  <td className="py-2 pr-4 text-right">
                    {row.current_rating != null ? row.current_rating.toFixed(1) : '—'}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    {hasPending ? row.pending_count : '—'}
                  </td>
                  {state === 'confirm' && (
                    <>
                      <td className="py-2 pr-4 text-right">
                        <input
                          type="number"
                          min={0}
                          max={10}
                          step={0.1}
                          value={editedVal ?? 0}
                          onChange={(e) =>
                            setEdited((prev) => ({
                              ...prev,
                              [row.player_id]: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="w-16 text-right border border-border rounded px-1 py-0.5 bg-background"
                        />
                      </td>
                      <td
                        className={`py-2 text-right font-medium ${
                          delta === null || delta === 0
                            ? 'text-muted-foreground'
                            : delta > 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {delta === null || delta === 0
                          ? '—'
                          : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`}
                      </td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {state === 'confirm' && (
        <div className="flex gap-3">
          <button
            onClick={handleApply}
            className="px-4 py-2 bg-fcda-gold text-fcda-navy text-sm font-semibold rounded"
          >
            Aplicar todas
          </button>
          <button
            onClick={() => { setState('idle'); setEdited({}); setSuggestions([]) }}
            className="px-4 py-2 border border-border text-sm rounded"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}
