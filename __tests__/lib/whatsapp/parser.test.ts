import { describe, it, expect } from 'vitest'
import { normaliseAlias, extractNames } from '@/lib/whatsapp/parser'

describe('normaliseAlias', () => {
  it('lowercases input', () => {
    expect(normaliseAlias('Silva')).toBe('silva')
  })

  it('strips acute diacritics', () => {
    expect(normaliseAlias('André')).toBe('andre')
  })

  it('strips cedilla', () => {
    expect(normaliseAlias('Gonçalves')).toBe('goncalves')
  })

  it('strips tilde', () => {
    expect(normaliseAlias('João')).toBe('joao')
  })

  it('trims surrounding whitespace', () => {
    expect(normaliseAlias('  silva  ')).toBe('silva')
  })

  it('handles mixed case with diacritics', () => {
    expect(normaliseAlias('ÂNGELO')).toBe('angelo')
  })
})

describe('extractNames', () => {
  it('extracts names from @ lines', () => {
    const text = 'Domingo 11:00h\nArca de água 7v7\n@João Silva\n@Pedro'
    expect(extractNames(text)).toEqual(['João Silva', 'Pedro'])
  })

  it('ignores lines without @', () => {
    const text = 'Location: park\n@João\nSome other text\n@Pedro'
    expect(extractNames(text)).toEqual(['João', 'Pedro'])
  })

  it('returns empty array for empty text', () => {
    expect(extractNames('')).toEqual([])
  })

  it('returns empty array when no @ lines', () => {
    expect(extractNames('Domingo 11:00h\nArca de água 7v7')).toEqual([])
  })

  it('strips the @ prefix from each name', () => {
    expect(extractNames('@Rui')).toEqual(['Rui'])
  })

  it('trims whitespace around extracted names', () => {
    expect(extractNames('@  Rui  ')).toEqual(['Rui'])
  })

  it('filters out blank names after stripping @', () => {
    expect(extractNames('@\n@João')).toEqual(['João'])
  })
})
