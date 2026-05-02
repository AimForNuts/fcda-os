export const DEFAULT_NATIONALITY = 'PT'

export const NATIONALITY_OPTIONS = [
  'PT',
  'BR',
  'AO',
  'MZ',
  'CV',
  'GW',
  'ST',
  'TL',
  'ES',
  'FR',
  'IT',
  'DE',
  'GB',
  'IE',
  'NL',
  'BE',
  'CH',
  'SE',
  'NO',
  'DK',
  'FI',
  'PL',
  'UA',
  'RO',
  'MD',
  'MA',
  'DZ',
  'TN',
  'SN',
  'NG',
  'GH',
  'CM',
  'ZA',
  'AR',
  'UY',
  'CO',
  'VE',
  'MX',
  'US',
  'CA',
] as const

export function normalizeNationality(value: string | null | undefined) {
  const normalized = (value ?? DEFAULT_NATIONALITY).trim().toUpperCase()
  return /^[A-Z]{2}$/.test(normalized) ? normalized : DEFAULT_NATIONALITY
}

export function getNationalityFlag(value: string | null | undefined) {
  const code = normalizeNationality(value)
  return code
    .split('')
    .map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)))
    .join('')
}

export function getNationalityFlagImageUrl(value: string | null | undefined) {
  return `https://flagcdn.com/w40/${normalizeNationality(value).toLowerCase()}.png`
}

export function getNationalityLabel(value: string | null | undefined, locale = 'pt-PT') {
  const code = normalizeNationality(value)

  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}
