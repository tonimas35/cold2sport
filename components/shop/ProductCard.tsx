'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import Badge from '@/components/ui/Badge'
import type { Product } from '@/lib/products'

export default function ProductCard({ product }: { product: Product }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        href={`/shop/${product.slug}`}
        className="glass-card group block overflow-hidden rounded-3xl"
      >
        <div className="relative aspect-square overflow-hidden">
          <Image
            src={product.image}
            alt={`${product.name} — ${product.category} by Cold2Sport`}
            fill
            className="object-cover transition-all duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-darker/70 via-transparent to-transparent" />
          <div className="absolute left-3 top-3">
            <Badge variant="glass">{product.category}</Badge>
          </div>
          {product.badge && (
            <div className="absolute right-3 top-3">
              <Badge variant="gold">{product.badge}</Badge>
            </div>
          )}
          <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 transition-all duration-400 group-hover:translate-y-0 group-hover:opacity-100">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white shadow-glow">
              View Product
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </div>
        </div>
        <div className="p-5">
          <h3 className="font-display text-base font-bold tracking-tight text-white">{product.name}</h3>
          <div className="mt-2 flex items-center justify-between">
            <p className="font-display text-lg font-bold text-brand-blue">€{product.price.toFixed(2)}</p>
            {(product.temperature || product.autonomy) && (
              <p className="text-[11px] tracking-wider text-gray-500">
                {[product.temperature, product.autonomy].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
