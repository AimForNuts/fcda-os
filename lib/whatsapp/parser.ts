/**
 * The result of matching a single extracted name against player_aliases in the DB.
 * Returned by the parse API route — not DB-dependent here.
 */
export type ParsedEntry = {
  raw: string         // original extracted name, e.g. "João Silva"
  normalised: string  // lowercased + diacritics stripped, e.g. "joao silva"
  status: 'matched' | 'ambiguous' | 'unmatched'
  matches: Array<{ id: string; sheet_name: string }>
}

/**
 * Normalise a player alias for matching against player_aliases.alias:
 * - trim whitespace
 * - lowercase
 * - NFD decomposition (separate base char + diacritic)
 * - remove diacritic code points U+0300–U+036F
 */
export function normaliseAlias(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Extract player names from a WhatsApp group message.
 * Keeps only lines whose trimmed form starts with @, strips the @ prefix.
 */
export function extractNames(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('@'))
    .map((line) => line.slice(1).trim())
    .filter(Boolean)
}
