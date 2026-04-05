import type { Metadata } from 'next'
import ProductGrid from '@/components/shop/ProductGrid'

export const metadata: Metadata = {
  title: 'Shop — Cold2Sport Recovery Garments',
  description:
    'Browse the full Cold2Sport collection: thermal shorts, knee pads, anklets, cold packs and recovery accessories.',
  openGraph: {
    title: 'Shop — Cold2Sport Recovery Garments',
    description: 'Browse the full Cold2Sport collection.',
    images: ['https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&q=80'],
  },
}

export default function ShopPage() {
  return (
    <div className="min-h-screen bg-white pt-24">
      {/* Header on navy */}
      <div className="bg-brand-navy py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-4 font-body text-[12px] tracking-wide text-brand-text-light">
            <a href="/" className="hover:text-brand-blue">Home</a>
            <span className="mx-2 text-white/20">/</span>
            <span className="text-white">Shop</span>
          </nav>
          <h1 className="font-heading text-[48px] font-light text-white">
            Recovery Collection
          </h1>
          <p className="mt-3 font-body text-[17px] text-brand-text-light">
            Professional-grade cooling garments and accessories
          </p>
        </div>
      </div>
      <ProductGrid />
    </div>
  )
}
