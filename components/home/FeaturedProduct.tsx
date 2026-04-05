'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { products } from '@/lib/products'

export default function FeaturedProduct() {
  const product = products[0]

  return (
    <section className="bg-brand-offwhite py-24">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-16 px-6 lg:flex-row lg:gap-20 lg:px-8">
        {/* Image — no border-radius, slight shadow */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
          className="flex-1"
        >
          <Image
            src={product.image}
            alt={`${product.name} — ${product.description}`}
            width={600}
            height={450}
            className="w-full object-cover shadow-md"
          />
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="flex-1"
        >
          <p className="mb-3 font-body text-[11px] font-medium tracking-[0.1em] text-brand-blue">
            Featured Product
          </p>
          <h2 className="font-heading text-[48px] font-normal leading-tight text-brand-navy">
            {product.name}
          </h2>
          {/* Price as design element */}
          <p className="mt-2 font-heading text-[64px] font-light leading-none text-brand-blue">
            €{product.price}
          </p>
          <span className="mt-3 inline-block rounded-full bg-brand-blue px-3 py-1 text-[12px] font-medium text-white">
            Bestseller
          </span>
          <p className="mt-5 font-body text-[16px] text-brand-text-mid">{product.description}</p>

          {/* Specs with left blue border */}
          <div className="mt-8 space-y-3">
            {[
              { label: 'Temperature', value: product.temperature },
              { label: 'Autonomy', value: product.autonomy },
              { label: 'Material', value: product.material },
            ].map(
              (spec) =>
                spec.value && (
                  <div key={spec.label} className="flex items-center rounded-lg border-l-2 border-brand-blue bg-white px-4 py-3">
                    <span className="w-28 font-body text-[13px] font-medium text-brand-text-mid">{spec.label}</span>
                    <span className="font-heading text-[15px] text-brand-navy">{spec.value}</span>
                  </div>
                )
            )}
          </div>

          <div className="mt-8">
            <a
              href={`/shop/${product.slug}`}
              className="inline-flex items-center gap-2 rounded-full bg-brand-navy px-8 py-4 text-[15px] font-medium text-white transition-all duration-300 hover:bg-brand-navy/90"
            >
              View Product
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
