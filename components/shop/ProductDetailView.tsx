'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import type { Product } from '@/lib/products'

export default function ProductDetailView({ product }: { product: Product }) {
  return (
    <div className="pt-24 pb-20">
      <div className="container-wide">
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm text-brand-text-light">
          <Link href="/cold2sport" className="hover:text-brand-navy transition-colors">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/cold2sport/shop" className="hover:text-brand-navy transition-colors">Shop</Link>
          <span className="mx-2">/</span>
          <span className="text-brand-navy">{product.name}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-brand-offwhite">
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-cover"
                priority
              />
              {product.badge && (
                <div className="absolute top-4 left-4">
                  <span className="bg-brand-blue text-white text-xs font-heading font-medium px-3 py-1.5 rounded-lg">
                    {product.badge}
                  </span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <p className="text-sm text-brand-blue font-heading uppercase tracking-wider mb-2">
              {product.category}
            </p>
            <h1 className="text-3xl md:text-4xl font-heading font-light text-brand-navy tracking-tight mb-4">
              {product.name}
            </h1>
            <div className="text-3xl font-heading font-medium text-brand-navy mb-6">
              €{product.price}
              {product.priceMax ? <span className="text-lg text-brand-text-light"> – €{product.priceMax}</span> : ''}
            </div>

            <p className="text-brand-text-mid leading-relaxed mb-8">
              {product.description}
            </p>

            {/* Specs */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              {product.temperature && (
                <div className="bg-brand-offwhite rounded-xl p-4">
                  <div className="text-xs text-brand-text-light uppercase tracking-wider mb-1">Temperature</div>
                  <div className="text-sm font-heading font-medium text-brand-navy">{product.temperature}</div>
                </div>
              )}
              {product.autonomy && (
                <div className="bg-brand-offwhite rounded-xl p-4">
                  <div className="text-xs text-brand-text-light uppercase tracking-wider mb-1">Autonomy</div>
                  <div className="text-sm font-heading font-medium text-brand-navy">{product.autonomy}</div>
                </div>
              )}
              <div className="bg-brand-offwhite rounded-xl p-4">
                <div className="text-xs text-brand-text-light uppercase tracking-wider mb-1">Material</div>
                <div className="text-sm font-heading font-medium text-brand-navy">{product.material}</div>
              </div>
              <div className="bg-brand-offwhite rounded-xl p-4">
                <div className="text-xs text-brand-text-light uppercase tracking-wider mb-1">Sizes</div>
                <div className="text-sm font-heading font-medium text-brand-navy">{product.sizes.join(', ')}</div>
              </div>
            </div>

            {/* Benefits */}
            <div className="mb-8">
              <h3 className="text-sm font-heading font-semibold text-brand-navy uppercase tracking-wider mb-3">
                Benefits
              </h3>
              <ul className="space-y-2">
                {product.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-brand-text-mid">
                    <svg className="w-4 h-4 text-brand-blue mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <a
              href="mailto:info@cold2sport.com?subject=Order Inquiry: ${product.name}"
              className="inline-flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-hover text-white font-heading font-medium text-sm px-8 py-4 rounded-lg transition-colors w-full justify-center sm:w-auto"
            >
              Inquire About This Product
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
