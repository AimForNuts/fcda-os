import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchSessionContext, canAccessAdmin } from '@/lib/auth/permissions'

const schema = z.object({
  feedback: z.string().max(1000).nullable(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await fetchSessionContext()
  if (!session) return Response.json({ error: 'Unauthorised' }, { status: 401 })
  if (!canAccessAdmin(session.roles)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const admin = createServiceClient()

  const { data: existing } = await admin
    .from('rating_submissions')
    .select('id')
    .eq('id', id)
    .eq('status', 'approved')
    .maybeSingle() as { data: { id: string } | null; error: unknown }

  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  const { error } = await (admin.from('rating_submissions') as any)
    .update({ feedback: parsed.data.feedback })
    .eq('id', id)
    .eq('status', 'approved')

  if (error) return Response.json({ error: 'Failed to update feedback' }, { status: 500 })

  return Response.json({ ok: true })
}
