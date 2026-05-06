import { NextResponse } from 'next/server'
import { fetchSessionContext } from '@/lib/auth/permissions'
import { fetchPlayersList, PLAYERS_PAGE_SIZE } from '@/lib/players/list'

export async function GET(request: Request) {
  const session = await fetchSessionContext()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const offset = parsePositiveInteger(url.searchParams.get('offset'), 0)
  const limit = Math.min(
    parsePositiveInteger(url.searchParams.get('limit'), PLAYERS_PAGE_SIZE),
    48,
  )
  const search = url.searchParams.get('q') ?? ''

  const result = await fetchPlayersList({
    session,
    offset,
    limit,
    search,
  })

  return NextResponse.json({
    players: result.players,
    hasMore: result.hasMore,
    isApproved: result.isApproved,
  })
}

function parsePositiveInteger(value: string | null, fallback: number) {
  if (!value) return fallback

  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}
