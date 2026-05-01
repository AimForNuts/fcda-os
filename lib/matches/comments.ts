export type MentionableUser = {
  id: string
  display_name: string
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function getMentionToken(user: MentionableUser) {
  return `@${user.display_name}`
}

export function userIsMentioned(content: string, user: MentionableUser): boolean {
  const mention = escapeRegExp(getMentionToken(user))
  const pattern = new RegExp(`${mention}(?=$|[^\\p{L}\\p{N}_-])`, 'iu')
  return pattern.test(content)
}

export function extractMentionUserIds(content: string, users: MentionableUser[]): string[] {
  const sortedUsers = [...users].sort((a, b) => b.display_name.length - a.display_name.length)
  const ids = new Set<string>()
  let index = 0

  while (index < content.length) {
    const match = sortedUsers.find((user) => {
      const mention = getMentionToken(user)
      const segment = content.slice(index, index + mention.length)
      const nextChar = content[index + mention.length]
      const hasBoundary = !nextChar || !/[\p{L}\p{N}_-]/u.test(nextChar)

      return segment.toLocaleLowerCase('pt-PT') === mention.toLocaleLowerCase('pt-PT') && hasBoundary
    })

    if (match) {
      ids.add(match.id)
      index += getMentionToken(match).length
    } else {
      index += 1
    }
  }

  return [...ids]
}
