import { createHmac, timingSafeEqual } from 'node:crypto'

function getCalendarTokenSecret() {
  const secret = process.env.CALENDAR_TOKEN_SECRET ?? process.env.SUPABASE_SECRET_KEY
  if (!secret) throw new Error('Missing CALENDAR_TOKEN_SECRET or SUPABASE_SECRET_KEY')
  return secret
}

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value).toString('base64url')
}

function sign(payload: string) {
  return createHmac('sha256', getCalendarTokenSecret()).update(payload).digest('base64url')
}

export function createPlayerCalendarToken(playerId: string) {
  const payload = base64UrlEncode(playerId)
  return `${payload}.${sign(payload)}`
}

export function readPlayerCalendarToken(token: string) {
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null

  const expected = sign(payload)
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null
  }

  return Buffer.from(payload, 'base64url').toString('utf8')
}
