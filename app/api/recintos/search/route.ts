import { z } from 'zod'
import { fetchSessionContext, canAccessMod } from '@/lib/auth/permissions'
import {
  getGooglePlacePredictions,
  GooglePlacesError,
} from '@/lib/recintos/google-places.server'

const searchSchema = z.object({
  query: z.string().min(3).max(200),
  sessionToken: z.string().optional(),
})

export async function POST(request: Request) {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })
  if (!canAccessMod(session.roles)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const parsed = searchSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  try {
    const result = await getGooglePlacePredictions({
      query: parsed.data.query,
      sessionToken: parsed.data.sessionToken,
      userId: session.userId,
    })

    return Response.json(result)
  } catch (error) {
    if (error instanceof GooglePlacesError) {
      return Response.json({ error: error.message }, { status: error.status })
    }

    return Response.json({ error: 'Failed to search recintos' }, { status: 500 })
  }
}
