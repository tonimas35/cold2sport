import type { Metadata } from 'next'
import ProductGrid from '@/components/shop/ProductGrid'

export const metadata: Metadata = {
  title: 'Shop — Cold2Sport Recovery Garments',
  description:
    'Browse the full Cold2Sport collection: thermal shorts, knee pads, anklets, cold packs and recovery accessories.',
  openGraph: {
    title: 'Shop — Cold2Sport Recovery Garments',
    description:
      'Browse the full Cold2Sport collection: thermal shorts, knee pads, anklets, cold packs and recovery accessories.',
    images: ['https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&q=80'],
  },
}

export default function ShopPage() {
  return (
    <div className="relative min-h-screen bg-brand-darker pt-24">
      {/* Header */}
      <div className="section-contained border-b border-white/[0.04] bg-brand-dark py-16">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute right-0 top-0 h-[200px] w-[200px] blob-blue opacity-20" />
        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-5 text-[12px] tracking-wide text-gray-500">
            <a href="/" className="transition-colors hover:text-brand-blue">Home</a>
            <span className="mx-2 text-gray-700">/</span>
            <span className="text-white">Shop</span>
          </nav>
          <h1 className="font-display text-4xl font-bold tracking-tight text-white lg:text-5xl">
            Recovery<br />Collection
          </h1>
          <p className="mt-4 max-w-md text-lg text-gray-400">
            Professional-grade cooling garments and accessories
          </p>
        </div>
      </div>
      <ProductGrid />
    </div>
  )
}
