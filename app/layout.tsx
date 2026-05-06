import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { I18nProvider } from '@/components/providers/I18nProvider'
import { WebVitalsReporter } from '@/components/performance/WebVitalsReporter'
import { ThemeProvider } from '@/components/providers/ThemeProvider'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'FCDA — Futebol Clube Dragões da Areosa',
  description: 'O site oficial do Futebol Clube Dragões da Areosa.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider defaultTheme="light">
          <I18nProvider>
            <WebVitalsReporter />
            {children}
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
