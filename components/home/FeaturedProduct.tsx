'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { products } from '@/lib/products'

export default function FeaturedProduct() {
  const product = products[0]

  return (
    <section className="section-contained bg-brand-dark py-24">
      <div className="absolute left-0 top-1/2 h-[400px] w-[400px] -translate-y-1/2 blob-gold opacity-40" />
      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center gap-16 px-6 lg:flex-row lg:gap-20 lg:px-8">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1"
        >
          <Badge variant="gold" className="mb-4">Featured Product</Badge>
          <h2 className="font-display text-4xl font-bold tracking-tight text-white lg:text-5xl">
            {product.name}
          </h2>
          <p className="mt-3 font-display text-3xl font-bold text-brand-blue">€{product.price}</p>
          <p className="mt-5 text-lg leading-relaxed text-gray-400">{product.description}</p>

          <div className="mt-8 space-y-4">
            {[
              { label: 'Temperature', value: product.temperature, color: 'text-brand-blue' },
              { label: 'Autonomy', value: product.autonomy, color: 'text-brand-gold' },
              { label: 'Material', value: product.material, color: 'text-white' },
            ].map(
              (spec) =>
                spec.value && (
                  <div key={spec.label} className="flex items-center gap-4">
                    <span className="w-28 text-[11px] uppercase tracking-wider text-gray-500">{spec.label}</span>
                    <span className="h-px flex-1 bg-white/[0.06]" />
                    <span className={`font-display font-bold ${spec.color}`}>{spec.value}</span>
                  </div>
                )
            )}
          </div>

          <div className="mt-10">
            <Button href={`/shop/${product.slug}`} size="lg">
              View Product
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex-1"
        >
          <div className="absolute inset-0 -z-10 scale-90 rounded-full bg-brand-blue/5 blur-[80px]" />
          <Image
            src={product.image}
            alt={`${product.name} — ${product.description}`}
            width={600}
            height={450}
            className="w-full rounded-3xl object-cover shadow-glow"
          />
        </motion.div>
      </div>
    </section>
  )
}
