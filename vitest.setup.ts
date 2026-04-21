import '@testing-library/jest-dom'
import React from 'react'
import { vi } from 'vitest'

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string | { src: string }; alt: string }) =>
    React.createElement('img', {
      src: typeof src === 'string' ? src : src.src,
      alt,
      ...props,
    }),
}))
