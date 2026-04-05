'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import ProductCard from '@/components/shop/ProductCard'
import type { Product } from '@/lib/products'

function SizeSelector({ sizes }: { sizes: string[] }) {
  const [selected, setSelected] = useState<string | null>(null)
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <label className="font-body text-[13px] font-medium text-brand-text-mid">Size</label>
        <button className="font-body text-[12px] text-brand-gold hover:underline">Size guide</button>
      </div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Select size">
        {sizes.map((size) => (
          <button
            key={size}
            onClick={() => setSelected(size)}
            role="radio"
            aria-checked={selected === size}
            className={`rounded-lg border px-5 py-2.5 font-body text-[14px] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
              selected === size
                ? 'border-brand-gold bg-brand-gold/10 text-brand-gold'
                : 'border-brand-border text-brand-text-mid hover:border-brand-gold/50'
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
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-brand-border">
        <Image src={images[mainImage]} alt={`${product.name} — view ${mainImage + 1}`} fill priority className="object-cover" />
        {product.badge && (
          <div className="absolute left-4 top-4">
            <span className="rounded-full bg-brand-gold px-3 py-1 text-[11px] font-medium text-brand-navy">{product.badge}</span>
          </div>
        )}
      </div>
      <div className="mt-3 flex gap-3">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => setMainImage(i)}
            className={`relative h-20 w-20 overflow-hidden rounded-lg border transition-all ${
              mainImage === i ? 'border-brand-gold' : 'border-brand-border opacity-50 hover:opacity-80'
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

export default function ProductDetail({ product, related }: { product: Product; related: Product[] }) {
  return (
    <div className="min-h-screen bg-white pt-24">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-10 font-body text-[12px] text-brand-text-light">
          <Link href="/" className="hover:text-brand-gold">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/shop" className="hover:text-brand-gold">Shop</Link>
          <span className="mx-2">/</span>
          <span className="text-brand-navy">{product.name}</span>
        </nav>

        <div className="grid gap-16 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <ProductGallery product={product} />
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="flex flex-col">
            <h1 className="font-heading text-[36px] font-normal text-brand-navy">{product.name}</h1>
            <p className="mt-2 font-heading text-[48px] font-light text-brand-gold">€{product.price.toFixed(2)}</p>
            <p className="mt-4 font-body text-[16px] leading-relaxed text-brand-text-mid">{product.description}</p>

            {(product.temperature || product.autonomy) && (
              <div className="mt-6 space-y-2">
                {[
                  { label: 'Temperature', value: product.temperature },
                  { label: 'Autonomy', value: product.autonomy },
                  { label: 'Material', value: product.material },
                ].map(
                  (spec) =>
                    spec.value && (
                      <div key={spec.label} className="flex items-center rounded-lg border-l-2 border-brand-blue bg-brand-cream px-4 py-3">
                        <span className="w-28 font-body text-[13px] font-medium text-brand-text-mid">{spec.label}</span>
                        <span className="font-heading text-[15px] text-brand-navy">{spec.value}</span>
                      </div>
                    )
                )}
              </div>
            )}

            <div className="my-8 h-px bg-brand-border" />
            <SizeSelector sizes={product.sizes} />

            <div className="mt-8">
              <button className="w-full rounded-full bg-brand-navy px-8 py-4 font-body text-[15px] font-medium text-white transition-all hover:bg-brand-navy/90">
                Add to Cart
              </button>
            </div>

            <div className="mt-6 flex flex-wrap gap-6 font-body text-[12px] text-brand-text-light">
              <span>✓ Free shipping +€75</span>
              <span>✓ 30-day returns</span>
              <span className="text-brand-gold">✓ Official FCB partner</span>
            </div>
          </motion.div>
        </div>

        {/* Benefits */}
        <section className="mt-24">
          <h2 className="mb-12 text-center font-heading text-[48px] font-normal text-brand-navy">Key Benefits</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {product.benefits.map((benefit, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                className="rounded-2xl bg-brand-cream p-5"
              >
                <div className="mb-2 h-[2px] w-6 bg-brand-gold" />
                <p className="font-body text-[14px] font-medium text-brand-navy">{benefit}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {related.length > 0 && (
          <section className="mt-24">
            <h2 className="mb-12 text-center font-heading text-[48px] font-normal text-brand-navy">You might also like</h2>
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
