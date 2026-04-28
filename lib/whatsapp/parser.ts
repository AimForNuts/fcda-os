/**
 * The result of matching a single extracted name against player_aliases in the DB.
 * Returned by the parse API route — not DB-dependent here.
 */
export type ParsedEntry = {
  raw: string         // original extracted name, e.g. "João Silva"
  normalised: string  // lowercased + diacritics stripped, e.g. "joao silva"
  status: 'matched' | 'ambiguous' | 'unmatched'
  matches: Array<{
    id: string
    sheet_name: string
    shirt_number: number | null
    avatar_url: string | null
  }>
}

// WhatsApp bidi isolates (U+2068/U+2069) and other invisible Unicode control chars
const INVISIBLE_CHARS = /[\u200b-\u200f\u2028-\u202f\u2060-\u206f\ufeff]/gu

export function normaliseAlias(raw: string): string {
  return raw
    .replace(INVISIBLE_CHARS, '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Extract player names from a WhatsApp group message.
 * Keeps only lines whose trimmed form starts with @, strips the @ prefix.
 * Invisible chars are stripped first so bidi isolates before @ don't block detection.
 */
export function extractNames(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.replace(INVISIBLE_CHARS, '').trim())
    .filter((line) => line.startsWith('@'))
    .map((line) => line.slice(1).trim())
    .filter(Boolean)
}
