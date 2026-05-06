import '@testing-library/jest-dom/vitest'
import i18n from '@/i18n/config'
import React from 'react'
import { vi } from 'vitest'

i18n.changeLanguage('pt-PT')

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string | { src: string }; alt: string }) =>
    React.createElement('img', {
      src: typeof src === 'string' ? src : src.src,
      alt,
      ...props,
    }),
}))
