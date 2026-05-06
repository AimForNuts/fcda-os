import { z } from 'zod'
import { fetchSessionContext, canAccessMod } from '@/lib/auth/permissions'
import { createClient } from '@/lib/supabase/server'
import {
  getGooglePlaceDetails,
  GooglePlacesError,
} from '@/lib/recintos/google-places.server'
import type { Database } from '@/types/database'
import type { Recinto } from '@/types'

const detailsSchema = z.object({
  placeId: z.string().min(1).max(300),
  sessionToken: z.string().optional(),
})

type RecintoInsert = Database['public']['Tables']['recintos']['Insert']
type RecintoUpdate = Database['public']['Tables']['recintos']['Update']

export async function POST(request: Request) {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })
  if (!canAccessMod(session.roles)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const parsed = detailsSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  try {
    const details = await getGooglePlaceDetails({
      placeId: parsed.data.placeId,
      sessionToken: parsed.data.sessionToken,
    })
    const now = new Date().toISOString()
    const payload = {
      name: details.name,
      google_place_id: details.placeId,
      formatted_address: details.formattedAddress ?? null,
      latitude: details.latitude ?? null,
      longitude: details.longitude ?? null,
      maps_url: details.mapsUrl,
      last_used_at: now,
      updated_at: now,
    } satisfies RecintoInsert

    const supabase = await createClient()
    const { data: existingByPlaceId } = await supabase
      .from('recintos')
      .select('*')
      .eq('google_place_id', details.placeId)
      .maybeSingle() as { data: Recinto | null; error: unknown }

    const { data: existingByName } = existingByPlaceId
      ? { data: null }
      : await supabase
        .from('recintos')
        .select('*')
        .ilike('name', details.name)
        .maybeSingle() as { data: Recinto | null; error: unknown }

    const existing = existingByPlaceId ?? existingByName
    const saveQuery = existing
      ? supabase
        .from('recintos')
        .update(payload satisfies RecintoUpdate)
        .eq('id', existing.id)
      : supabase
        .from('recintos')
        .insert(payload)

    const { data: recinto, error } = await saveQuery
      .select('*')
      .single() as { data: Recinto | null; error: unknown }

    if (error || !recinto) {
      return Response.json({ error: 'Failed to save recinto' }, { status: 500 })
    }

    return Response.json({ recinto })
  } catch (error) {
    if (error instanceof GooglePlacesError) {
      return Response.json({ error: error.message }, { status: error.status })
    }

    return Response.json({ error: 'Failed to load recinto details' }, { status: 500 })
  }
}
