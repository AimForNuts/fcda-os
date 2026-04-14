import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-fcda-ice px-4">
      <Link href="/" className="mb-8 flex flex-col items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/crest.png" alt="FCDA" className="h-16 w-16 object-contain" />
        <span className="text-2xl font-extrabold uppercase tracking-wide text-fcda-navy">
          FCDA
        </span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
