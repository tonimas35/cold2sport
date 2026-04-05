import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Page Not Found — Cold2Sport',
}

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-offwhite px-6 text-center">
      <p className="font-heading text-[120px] font-light leading-none text-brand-blue/20">404</p>
      <h1 className="mt-4 font-heading text-[28px] font-normal text-brand-navy">Page not found</h1>
      <p className="mt-2 font-body text-[16px] text-brand-text-mid">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="mt-8 flex gap-4">
        <a href="/" className="rounded-full bg-brand-navy px-7 py-3 font-body text-[14px] font-medium text-white hover:bg-brand-navy/90">
          Back to Home
        </a>
        <a href="/shop" className="rounded-full border border-brand-navy/20 px-7 py-3 font-body text-[14px] font-medium text-brand-navy hover:bg-brand-navy hover:text-white">
          Browse Shop
        </a>
      </div>
    </div>
  )
}
