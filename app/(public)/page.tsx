import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function HomePage() {
  return (
    <div className="container max-w-screen-xl mx-auto px-4 py-12">
      <div className="flex flex-col items-center text-center gap-6">
        <Badge variant="outline" className="text-green-600 border-green-600">
          Futebol Clube Dragões da Areosa
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
          Bem-vindos ao{' '}
          <span className="text-green-600">FCDA</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl">
          Acompanha os jogos, vê as estatísticas e gere a equipa.
        </p>

        <Card className="w-full max-w-md mt-4">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Próximo Jogo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Sem jogos agendados de momento.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
