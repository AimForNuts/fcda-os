import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4">
      <Link href="/" className="mb-8 text-2xl font-bold">
        <span className="text-green-600">FCDA</span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
