import { ExternalLink, MapPin } from 'lucide-react'
import { getRecintoMapEmbedUrl } from '@/lib/recintos/google-maps-embed.server'
import { buildGoogleMapsUrl, getRecintoMapsUrl } from '@/lib/recintos/google-maps'
import type { Recinto } from '@/types'

type Props = {
  location: string
  recinto: Recinto | null
}

export function RecintoMapPreview({ location, recinto }: Props) {
  const embedUrl = getRecintoMapEmbedUrl(recinto, location)
  if (!embedUrl) return null

  const mapsUrl = getRecintoMapsUrl(recinto) ?? buildGoogleMapsUrl({ name: location })
  const title = `Mapa de ${recinto?.name || location}`

  return (
    <section className="border-y border-border py-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-black uppercase text-muted-foreground">
          Mapa
        </h2>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-bold text-fcda-blue hover:underline"
        >
          Abrir
          <ExternalLink className="size-3.5" aria-hidden />
        </a>
      </div>

      <div className="relative overflow-hidden rounded-lg border border-border bg-muted">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 z-10 md:hidden"
          aria-label={`Abrir ${location} no Google Maps`}
        />
        <iframe
          title={title}
          src={embedUrl}
          className="h-56 w-full border-0"
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <div className="mt-3 grid grid-cols-[1rem_minmax(0,1fr)] gap-2 text-sm">
        <MapPin className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{location}</p>
          {recinto?.formatted_address ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {recinto.formatted_address}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
