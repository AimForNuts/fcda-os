import { NextResponse } from 'next/server'

const validMetricNames = new Set(['CLS', 'FCP', 'FID', 'INP', 'LCP', 'TTFB'])

export async function POST(request: Request) {
  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  if (!isVitalsPayload(payload)) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  console.info('[web-vitals]', payload)

  return NextResponse.json({ ok: true })
}

function isVitalsPayload(payload: unknown): payload is {
  id: string
  name: string
  value: number
  rating?: string
  delta?: number
  navigationType?: string
  page?: string
  search?: string
  timestamp?: number
} {
  if (typeof payload !== 'object' || payload === null) return false

  const candidate = payload as Record<string, unknown>

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    validMetricNames.has(candidate.name) &&
    typeof candidate.value === 'number'
  )
}
