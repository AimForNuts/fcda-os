import { createClient } from '@/lib/supabase/server'
import { AiAssistantClient } from './AiAssistantClient'

export default async function AiAssistantPage() {
  const supabase = await createClient()

  const { data: games } = (await supabase
    .from('games')
    .select('id, date, location')
    .eq('status', 'scheduled')
    .order('date', { ascending: true })) as {
    data: Array<{ id: string; date: string; location: string }> | null
    error: unknown
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fcda-navy">AI Assistant</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate a ChatGPT prompt for balanced team selection.
        </p>
      </div>
      <AiAssistantClient games={games ?? []} />
    </div>
  )
}
