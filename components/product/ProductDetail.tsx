'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import SectionHeader from '@/components/ui/SectionHeader'
import ProductCard from '@/components/shop/ProductCard'
import type { Product } from '@/lib/products'

function SizeSelector({ sizes }: { sizes: string[] }) {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <label className="text-[12px] font-semibold uppercase tracking-wider text-white/60">Size</label>
        <button className="text-[11px] text-brand-blue transition-colors hover:text-[#00c8ff]">Size guide</button>
      </div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Select size">
        {sizes.map((size) => (
          <button
            key={size}
            onClick={() => setSelected(size)}
            role="radio"
            aria-checked={selected === size}
            className={`rounded-xl border px-5 py-2.5 text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue ${
              selected === size
                ? 'border-brand-blue bg-brand-blue/15 text-brand-blue shadow-[0_0_15px_rgba(0,180,255,0.15)]'
                : 'border-white/10 text-white/60 hover:border-white/20 hover:text-white'
            }`}
          >
            {size}
          </button>
        ))}
      </div>
    </div>
  )
}

function ProductGallery({ product }: { product: Product }) {
  const [mainImage, setMainImage] = useState(0)
  const images = [
    product.image,
    `${product.image.split('?')[0]}?w=600&q=60&fit=crop&crop=left`,
    `${product.image.split('?')[0]}?w=600&q=60&fit=crop&crop=bottom`,
  ]

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl">
        <Image
          src={images[mainImage]}
          alt={`${product.name} — view ${mainImage + 1} of 3`}
          fill
          priority
          className="object-cover"
        />
        {product.badge && (
          <div className="absolute left-4 top-4">
            <Badge variant="gold">{product.badge}</Badge>
          </div>
        )}
        <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10" />
      </div>
      <div className="mt-4 flex gap-3">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => setMainImage(i)}
            className={`relative h-20 w-20 overflow-hidden rounded-xl transition-all duration-300 ${
              mainImage === i
                ? 'ring-2 ring-brand-blue shadow-glow'
                : 'opacity-40 ring-1 ring-white/10 hover:opacity-70'
            }`}
            aria-label={`View image ${i + 1}`}
          >
            <Image src={img} alt="" fill className="object-cover" />
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ProductDetail({
  product,
  related,
}: {
  product: Product
  related: Product[]
}) {
  return (
    <div className="relative min-h-screen bg-brand-darker pt-24">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-10 text-[12px] tracking-wide text-gray-500">
          <Link href="/" className="transition-colors hover:text-brand-blue">Home</Link>
          <span className="mx-2 text-gray-700">/</span>
          <Link href="/shop" className="transition-colors hover:text-brand-blue">Shop</Link>
          <span className="mx-2 text-gray-700">/</span>
          <span className="text-white">{product.name}</span>
        </nav>

        {/* Product */}
        <div className="grid gap-16 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <ProductGallery product={product} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex flex-col"
          >
            <h1 className="font-display text-4xl font-bold tracking-tight text-white">{product.name}</h1>
            <p className="mt-3 font-display text-3xl font-bold text-brand-blue">€{product.price.toFixed(2)}</p>
            <p className="mt-5 text-lg leading-relaxed text-gray-400">{product.description}</p>

            {/* Specs */}
            {(product.temperature || product.autonomy) && (
              <div className="mt-8 flex flex-wrap gap-3">
                {product.temperature && (
                  <span className="glass-card rounded-full px-5 py-2.5 text-sm font-semibold text-brand-blue">
                    {product.temperature}
                  </span>
                )}
                {product.autonomy && (
                  <span className="glass-card rounded-full px-5 py-2.5 text-sm font-semibold text-brand-gold">
                    {product.autonomy}
                  </span>
                )}
                <span className="glass-card rounded-full px-5 py-2.5 text-sm text-white/60">
                  {product.material}
                </span>
              </div>
            )}

            <div className="my-8 divider-glow" />

            <SizeSelector sizes={product.sizes} />

            <div className="mt-8">
              <Button size="lg" className="w-full">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
                Add to Cart
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap gap-6 text-[12px] text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-blue" />
                Free shipping +€75
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-blue" />
                30-day returns
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-gold" />
                Official FCB partner
              </span>
            </div>
          </motion.div>
        </div>

        {/* Benefits */}
        <section className="mt-24">
          <SectionHeader title="Key Benefits" light />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {product.benefits.map((benefit, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="glass-card rounded-2xl p-5"
              >
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-brand-blue/10">
                  <svg className="h-4 w-4 text-brand-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-white/80">{benefit}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Related Products */}
        {related.length > 0 && (
          <section className="mt-24">
            <SectionHeader title="You might also like" light />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
