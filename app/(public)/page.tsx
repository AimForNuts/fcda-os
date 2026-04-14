import { Card, CardContent } from '@/components/ui/card'

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero — icy blue texture echoing the match card background */}
      <section
        className="relative flex flex-col items-center justify-center gap-6 px-4 py-16 text-center"
        style={{ background: 'var(--fcda-ice)' }}
      >
        {/* Crest */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/crest.png"
          alt="Futebol Clube Dragões da Areosa"
          className="h-36 w-36 object-contain drop-shadow-lg"
        />

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-fcda-navy/60">
            Futebol Clube
          </p>
          <h1 className="mt-1 text-3xl font-extrabold uppercase tracking-tight text-fcda-navy md:text-5xl">
            Dragões da Areosa
          </h1>
        </div>

        <p className="max-w-md text-fcda-navy/70">
          Acompanha os jogos, vê as estatísticas e gere a equipa.
        </p>

        {/* Decorative divider */}
        <div className="flex items-center gap-3 text-fcda-gold">
          <span className="h-px w-16 bg-fcda-gold/50" />
          <span className="text-lg">✦</span>
          <span className="h-px w-16 bg-fcda-gold/50" />
        </div>
      </section>

      {/* Next match card */}
      <section className="container mx-auto max-w-screen-md px-4 py-10">
        <Card className="overflow-hidden border-border shadow-sm">
          {/* Card header strip — navy like the crest */}
          <div className="flex items-center justify-between bg-fcda-navy px-5 py-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-fcda-gold">
              Próximo Jogo
            </span>
          </div>

          <CardContent className="py-8 text-center">
            {/* Match-card style VS layout */}
            <div className="flex items-center justify-center gap-4">
              <span className="text-lg font-bold uppercase tracking-wide text-fcda-navy">
                Team White
              </span>
              <span className="rounded bg-fcda-navy px-3 py-1 text-sm font-extrabold uppercase tracking-widest text-fcda-gold">
                VS
              </span>
              <span className="text-lg font-bold uppercase tracking-wide text-fcda-navy">
                Team Black
              </span>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Sem jogos agendados de momento.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
