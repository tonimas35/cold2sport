import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-heading font-light text-brand-navy mb-4">404</h1>
        <p className="text-brand-text-mid mb-8">Page not found</p>
        <Link
          href="/cold2sport"
          className="inline-flex items-center gap-2 bg-brand-navy text-white font-heading font-medium text-sm px-6 py-3 rounded-lg hover:bg-brand-navy-deep transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  )
}
