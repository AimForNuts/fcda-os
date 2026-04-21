import type { FeedbackItem } from './page'
import { PlayerIdentity } from '@/components/player/PlayerIdentity'

type Props = {
  items: FeedbackItem[]
}

export function FeedbackInbox({ items }: Props) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">Sem comentários.</p>
  }

  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border border-border p-4 space-y-2">
          <div className="text-sm font-medium">
            {item.submitterName}
            {item.gameDate && (
              <span className="text-muted-foreground font-normal">
                {' — '}{item.gameDate}{item.gameLocation ? ` · ${item.gameLocation}` : ''}
              </span>
            )}
          </div>
          <ul className="space-y-1">
            {item.comments.map((c, j) => (
              <li key={j} className="text-sm">
                <span className="inline-flex items-center gap-2">
                  <PlayerIdentity
                    name={c.playerName}
                    avatarUrl={c.playerAvatarUrl}
                    avatarSize="sm"
                    nameClassName="font-medium"
                  />
                  <span>:</span>
                </span>{' '}
                <span className="text-muted-foreground">&ldquo;{c.content}&rdquo;</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
