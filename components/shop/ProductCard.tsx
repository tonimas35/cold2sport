'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import type { Product } from '@/lib/products'

export default function ProductCard({ product }: { product: Product }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        href={`/shop/${product.slug}`}
        className="group block overflow-hidden rounded-2xl border border-brand-border bg-white transition-all duration-300 hover:-translate-y-1 hover:border-brand-gold"
      >
        <div className="relative aspect-square overflow-hidden">
          <Image
            src={product.image}
            alt={`${product.name} — ${product.category} by Cold2Sport`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute left-3 top-3">
            <span className="rounded-full bg-brand-cream px-3 py-1 text-[11px] font-medium text-brand-text-mid">
              {product.category}
            </span>
          </div>
          {product.badge && (
            <div className="absolute right-3 top-3">
              <span className="rounded-full bg-brand-gold px-3 py-1 text-[11px] font-medium text-brand-navy">
                {product.badge}
              </span>
            </div>
          )}
          {/* CTA on hover */}
          <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-brand-navy/80 to-transparent p-4 transition-transform duration-300 group-hover:translate-y-0">
            <span className="inline-block rounded-full bg-brand-navy px-5 py-2 text-[13px] font-medium text-white">
              View Product
            </span>
          </div>
        </div>
        <div className="p-5">
          <h3 className="font-heading text-[16px] font-normal text-brand-navy">{product.name}</h3>
          <p className="mt-1.5 font-heading text-[18px] font-semibold text-brand-gold">
            €{product.price.toFixed(2)}
          </p>
          {(product.temperature || product.autonomy) && (
            <p className="mt-1 font-body text-[13px] text-brand-text-light">
              {[product.temperature, product.autonomy].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  )
}
