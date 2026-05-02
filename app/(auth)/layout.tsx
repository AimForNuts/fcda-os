import Link from 'next/link'
import { SiteFooter } from '@/components/layout/SiteFooter'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-fcda-ice">
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <Link href="/" className="mb-8 flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/crest.png" alt="FCDA" className="h-16 w-16 object-contain" />
          <span className="text-2xl font-extrabold uppercase tracking-wide text-fcda-navy">
            FCDA
          </span>
        </Link>
        <div className="w-full max-w-sm">{children}</div>
      </main>
      <SiteFooter />
    </div>
  )
}
