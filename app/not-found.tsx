import type { Metadata } from 'next'
import Button from '@/components/ui/Button'

export const metadata: Metadata = {
  title: 'Page Not Found — Cold2Sport',
}

export default function NotFound() {
  return (
    <div className="section-contained flex min-h-screen flex-col items-center justify-center bg-brand-darker px-6 text-center">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 blob-blue opacity-15" />
      <div className="relative z-10">
        <p className="font-display text-[10rem] font-extrabold leading-none text-gradient-blue opacity-20">404</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white">Page not found</h1>
        <p className="mt-3 text-gray-400">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Button href="/" size="md">
            Back to Home
          </Button>
          <Button href="/shop" variant="outline-white" size="md">
            Browse Shop
          </Button>
        </div>
      </div>
    </div>
  )
}
