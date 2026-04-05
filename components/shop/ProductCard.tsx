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
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <Link
        href={`/cold2sport/shop/${product.slug}`}
        className="group block bg-white rounded-2xl overflow-hidden border border-brand-border hover:shadow-lg transition-all duration-300"
      >
        <div className="relative aspect-square overflow-hidden bg-brand-offwhite">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {product.badge && (
            <div className="absolute top-3 left-3">
              <span className="bg-brand-blue text-white text-xs font-heading font-medium px-3 py-1 rounded-md">
                {product.badge}
              </span>
            </div>
          )}
        </div>
        <div className="p-5">
          <p className="text-xs text-brand-text-light uppercase tracking-wider mb-1">{product.category}</p>
          <h3 className="text-base font-heading font-medium text-brand-navy group-hover:text-brand-blue transition-colors mb-2">
            {product.name}
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-lg font-heading font-medium text-brand-navy">
              €{product.price}
              {product.priceMax ? `–${product.priceMax}` : ''}
            </span>
            {product.temperature && (
              <span className="text-xs text-brand-text-light">{product.temperature}</span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
